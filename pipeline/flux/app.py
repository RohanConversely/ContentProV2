import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

import main


app = FastAPI(title="BFL FLUX Jewellery Generator", version="1.0.0")
PROJECT_DIR = Path(__file__).resolve().parent
INPUT_DIR = PROJECT_DIR / main.INPUT_DIR_NAME


def sanitize_filename(name: str) -> str:
    return Path(name).name.replace(" ", "_")


def reset_input_dir() -> None:
    INPUT_DIR.mkdir(parents=True, exist_ok=True)
    for path in INPUT_DIR.iterdir():
        if path.is_file():
            path.unlink()


@app.on_event("startup")
def startup() -> None:
    load_dotenv(PROJECT_DIR / ".env")
    INPUT_DIR.mkdir(parents=True, exist_ok=True)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "backend": "bfl_flux_api"}


@app.post("/generate")
async def generate(
    reference_images: list[UploadFile] = File(...),
    kyc_text: str = Form(...),
    run_mode: str | None = Form(None),
) -> JSONResponse:
    if not reference_images:
        raise HTTPException(status_code=400, detail="At least one reference image is required.")
    if len(reference_images) > main.MAX_REFERENCE_IMAGES:
        raise HTTPException(
            status_code=400,
            detail=f"At most {main.MAX_REFERENCE_IMAGES} reference images are allowed.",
        )

    reset_input_dir()
    saved_files: list[str] = []

    for upload in reference_images:
        suffix = Path(upload.filename or "").suffix.lower()
        if suffix not in main.SUPPORTED_IMAGE_EXTS:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {upload.filename}")
        target = INPUT_DIR / sanitize_filename(upload.filename or "reference.png")
        target.write_bytes(await upload.read())
        saved_files.append(str(target))

    (INPUT_DIR / "KYC.txt").write_text(kyc_text, encoding="utf-8")

    previous_mode = os.getenv("FLUX_RUN_MODE")
    if run_mode:
        os.environ["FLUX_RUN_MODE"] = run_mode

    try:
        result = main.run_generation_pipeline(PROJECT_DIR)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        if run_mode is not None:
            if previous_mode is None:
                os.environ.pop("FLUX_RUN_MODE", None)
            else:
                os.environ["FLUX_RUN_MODE"] = previous_mode

    return JSONResponse(
        {
            "message": "Generation completed.",
            "input_files": saved_files,
            "result": result,
        }
    )
