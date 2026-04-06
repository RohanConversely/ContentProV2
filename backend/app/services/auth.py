from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.user import User

settings = get_settings()
PBKDF2_ITERATIONS = 600_000
PBKDF2_ALGORITHM = "sha256"


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    derived_key = hashlib.pbkdf2_hmac(
        PBKDF2_ALGORITHM,
        password.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
    )
    encoded_salt = base64.b64encode(salt).decode("ascii")
    encoded_key = base64.b64encode(derived_key).decode("ascii")
    return f"pbkdf2${PBKDF2_ALGORITHM}${PBKDF2_ITERATIONS}${encoded_salt}${encoded_key}"


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        scheme, algorithm, iterations_raw, encoded_salt, encoded_key = hashed_password.split("$", 4)
        if scheme != "pbkdf2":
            return False
        iterations = int(iterations_raw)
        salt = base64.b64decode(encoded_salt.encode("ascii"))
        expected_key = base64.b64decode(encoded_key.encode("ascii"))
    except (ValueError, TypeError, base64.binascii.Error):
        return False

    actual_key = hashlib.pbkdf2_hmac(
        algorithm,
        password.encode("utf-8"),
        salt,
        iterations,
    )
    return hmac.compare_digest(actual_key, expected_key)


def create_access_token(user: User) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": user.id, "email": user.email, "exp": expires_at}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email, User.is_deleted.is_(False)))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id, User.is_deleted.is_(False)))
    return result.scalar_one_or_none()


def decode_access_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except JWTError as exc:
        raise ValueError("Invalid access token.") from exc
    user_id = payload.get("sub")
    if not user_id:
        raise ValueError("Token missing subject.")
    return user_id
