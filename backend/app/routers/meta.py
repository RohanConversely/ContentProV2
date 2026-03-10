from fastapi import APIRouter

router = APIRouter(tags=["meta"])


@router.get("/audio/tracks")
async def get_audio_tracks() -> dict:
    return {
        "trending": [],
        "royalty_free": [],
    }


@router.get("/video/presets")
async def get_video_presets() -> dict:
    return {
        "durations": [
            {"value": 8, "label": "8 seconds", "desc": "Default video duration"},
        ],
        "styles": [],
    }
