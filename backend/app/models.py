from __future__ import annotations

from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field


class PreviewTable(BaseModel):
    columns: List[str]
    rows: List[Dict[str, Union[str, float, int, None]]]


class UploadMeta(BaseModel):
    encoding: str
    delimiter: str
    row_count: int
    step_count: int


class UploadResponse(BaseModel):
    toolNames: List[str] = Field(..., description="Ordered list of tool names (Y-axis).")
    stepNames: List[str] = Field(..., description="Ordered list of SDLC steps (X-axis).")
    matrix: List[List[Optional[float]]] = Field(
        ..., description="Scores matrix aligned with toolNames x stepNames."
    )
    minScore: float
    maxScore: float
    preview: PreviewTable
    warnings: List[str] = Field(default_factory=list)
    meta: UploadMeta


class SDLCNode(BaseModel):
    id: str
    label: str
    level: int
    node_type: str  # 'composite' | 'leaf'
    tags: List[str]
    base_prob: Optional[float] = None


class SDLCEdge(BaseModel):
    src: str
    dst: str
    edge_type: str  # 'sequence' | 'decomposition'
    params: Optional[Dict[str, Any]] = None


class SDLCGraph(BaseModel):
    nodes: List[SDLCNode]
    edges: List[SDLCEdge]


class GraphResponse(BaseModel):
    graph: SDLCGraph
    warnings: List[str] = Field(default_factory=list)
