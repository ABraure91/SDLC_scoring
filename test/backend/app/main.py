from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .errors import UserFacingError
from .models import UploadResponse
from .parsing import parse_scoring_csv


APP_TITLE = "IA SDLC Scoring Visualizer API"

app = FastAPI(title=APP_TITLE)

# Dev-friendly CORS (the Vite dev server runs on :5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(UserFacingError)
async def user_facing_error_handler(_, exc: UserFacingError):
    return JSONResponse(status_code=exc.status_code, content=exc.to_dict())


@app.get("/api/health")
async def health() -> Dict[str, Any]:
    return {"status": "ok"}


@app.post("/api/upload", response_model=UploadResponse)
async def upload_csv(file: UploadFile = File(...)):
    filename = file.filename or "uploaded.csv"
    if not filename.lower().endswith(".csv"):
        raise UserFacingError(
            code="invalid_extension",
            message="Format invalide. Veuillez importer un fichier .csv.",
            status_code=400,
        )

    data = await file.read()
    parsed = parse_scoring_csv(data, filename=filename)
    return parsed


@app.get("/api/sample", response_model=UploadResponse)
async def sample_data():
    """
    Convenience endpoint to quickly demo the UI without uploading a file.
    """
    root = Path(__file__).resolve().parents[2]  # project root
    sample_path = root / "sample_data" / "example_scoring.csv"
    if not sample_path.exists():
        raise UserFacingError(
            code="sample_not_found",
            message="Le fichier d'exemple est introuvable dans sample_data/.",
            status_code=500,
        )
    data = sample_path.read_bytes()
    parsed = parse_scoring_csv(data, filename=sample_path.name)
    return parsed
