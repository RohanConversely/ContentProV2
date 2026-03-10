from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, MeResponse, RegisterRequest, TokenResponse
from app.services.auth import (
    create_access_token,
    decode_access_token,
    get_user_by_email,
    get_user_by_id,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


async def get_current_user(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = extract_bearer_token(authorization)
    try:
        user = await get_user_from_token(db, token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    return user


def extract_bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise ValueError("Missing bearer token.")
    return authorization.split(" ", 1)[1]


async def get_user_from_token(db: AsyncSession, token: str) -> User:
    user_id = decode_access_token(token)
    user = await get_user_by_id(db, user_id)
    if user is None:
        raise ValueError("User not found.")
    return user


async def get_current_user_from_stream(
    authorization: str | None = Header(default=None),
    access_token: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = access_token
    if token is None:
        try:
            token = extract_bearer_token(authorization)
        except ValueError as exc:
            raise HTTPException(status_code=401, detail=str(exc)) from exc
    try:
        return await get_user_from_token(db, token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@router.post("/register", response_model=TokenResponse)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    existing = await get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(status_code=409, detail="User already exists.")
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        display_name=payload.display_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token(user)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        email=user.email,
        display_name=user.display_name,
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    user = await get_user_by_email(db, payload.email)
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials.")
    token = create_access_token(user)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        email=user.email,
        display_name=user.display_name,
    )


@router.get("/me", response_model=MeResponse)
async def me(current_user: User = Depends(get_current_user)) -> MeResponse:
    return MeResponse(
        user_id=current_user.id,
        email=current_user.email,
        display_name=current_user.display_name,
        plan=current_user.plan,
        member_since=current_user.created_at,
    )


@router.get("/google/login")
async def google_login(next_path: str | None = Query(default="/dashboard")) -> RedirectResponse:
    if not settings.google_client_id:
        raise HTTPException(status_code=500, detail="Google OAuth is not configured.")
    query = urlencode(
        {
            "client_id": settings.google_client_id,
            "redirect_uri": settings.google_callback_url,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "prompt": "select_account",
            "state": next_path or "/dashboard",
        }
    )
    return RedirectResponse(url=f"https://accounts.google.com/o/oauth2/v2/auth?{query}", status_code=302)


@router.get("/google/callback")
async def google_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default="/dashboard"),
    error: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    try:
        if error:
            return RedirectResponse(
                url=f"{settings.google_frontend_callback_url}?error={error}",
                status_code=302,
            )
        if not code:
            raise ValueError("Missing Google authorization code.")
        if not settings.google_client_id or not settings.google_client_secret:
            raise ValueError("Google OAuth is not configured.")

        async with httpx.AsyncClient(timeout=20.0) as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "redirect_uri": settings.google_callback_url,
                    "grant_type": "authorization_code",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            if token_response.status_code >= 400:
                raise ValueError(f"Google token exchange failed: {token_response.text}")
            token_payload = token_response.json()
            access_token = token_payload.get("access_token")
            if not access_token:
                raise ValueError("Google access token missing.")

            userinfo_response = await client.get(
                "https://openidconnect.googleapis.com/v1/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if userinfo_response.status_code >= 400:
                raise ValueError(f"Failed to fetch Google profile: {userinfo_response.text}")
            profile = userinfo_response.json()

        email = profile.get("email")
        display_name = profile.get("name") or email
        if not email:
            raise ValueError("Google account did not provide an email.")

        user = await get_user_by_email(db, email)
        if user is None:
            user = User(
                email=email,
                hashed_password=hash_password(access_token),
                display_name=display_name,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        elif user.display_name != display_name:
            user.display_name = display_name
            await db.commit()
            await db.refresh(user)

        jwt_token = create_access_token(user)
        next_path = state or "/dashboard"
        redirect_query = urlencode({"token": jwt_token, "next": next_path})
        return RedirectResponse(
            url=f"{settings.google_frontend_callback_url}?{redirect_query}",
            status_code=302,
        )
    except Exception as exc:
        redirect_query = urlencode({"error": str(exc)})
        return RedirectResponse(
            url=f"{settings.google_frontend_callback_url}?{redirect_query}",
            status_code=302,
        )
