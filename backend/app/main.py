from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .errors import UserFacingError
from .models import GraphResponse, SDLCGraph, UploadResponse
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


@app.post("/api/upload-graph", response_model=GraphResponse)
async def upload_graph(file: UploadFile = File(...)):
    """
    Endpoint pour uploader et valider un fichier JSON de graph SDLC.
    """
    filename = file.filename or "uploaded.json"
    if not filename.lower().endswith(".json"):
        raise UserFacingError(
            code="invalid_extension",
            message="Format invalide. Veuillez importer un fichier .json.",
            status_code=400,
        )

    try:
        data = await file.read()
        content = data.decode("utf-8")
        graph_dict = json.loads(content)
    except json.JSONDecodeError as e:
        raise UserFacingError(
            code="invalid_json",
            message=f"JSON invalide: {str(e)}",
            status_code=400,
        )
    except UnicodeDecodeError as e:
        raise UserFacingError(
            code="invalid_encoding",
            message=f"Encodage invalide: {str(e)}",
            status_code=400,
        )

    warnings = []
    try:
        graph = SDLCGraph(**graph_dict)
    except Exception as e:
        raise UserFacingError(
            code="invalid_graph_structure",
            message=f"Structure de graph invalide: {str(e)}",
            status_code=400,
        )

    # Validation supplémentaire
    node_ids = {node.id for node in graph.nodes}
    for edge in graph.edges:
        if edge.src not in node_ids:
            warnings.append(f"Edge source '{edge.src}' n'existe pas dans les nodes")
        if edge.dst not in node_ids:
            warnings.append(f"Edge destination '{edge.dst}' n'existe pas dans les nodes")

    return GraphResponse(graph=graph, warnings=warnings)


@app.get("/api/sample-graph", response_model=GraphResponse)
async def sample_graph():
    """
    Endpoint pour charger le graph SDLC d'exemple.
    """
    root = Path(__file__).resolve().parents[2]  # project root
    graph_path = root / "sample_data" / "graph.json"
    if not graph_path.exists():
        raise UserFacingError(
            code="sample_graph_not_found",
            message="Le fichier graph.json est introuvable dans sample_data/.",
            status_code=500,
        )

    try:
        content = graph_path.read_text(encoding="utf-8")
        graph_dict = json.loads(content)
        graph = SDLCGraph(**graph_dict)
        return GraphResponse(graph=graph, warnings=[])
    except json.JSONDecodeError as e:
        raise UserFacingError(
            code="invalid_json",
            message=f"JSON invalide dans graph.json: {str(e)}",
            status_code=500,
        )
    except Exception as e:
        raise UserFacingError(
            code="invalid_graph_structure",
            message=f"Structure de graph invalide: {str(e)}",
            status_code=500,
        )
