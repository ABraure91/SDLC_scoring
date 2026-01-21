from __future__ import annotations

import csv
import io
from dataclasses import dataclass
from typing import List, Optional, Tuple

import pandas as pd

from .errors import UserFacingError


ALLOWED_DELIMITERS = [",", ";", "\t", "|"]
MAX_FILE_BYTES = 5 * 1024 * 1024  # 5MB
MAX_ROWS = 2000  # soft limit to keep UI responsive in local runs
PREVIEW_ROWS = 10


def _decode_bytes(data: bytes) -> Tuple[str, str]:
    """
    Decode CSV file bytes into text. We attempt common encodings.
    """
    # Note: we intentionally keep this lightweight (no chardet dependency).
    for enc in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            return data.decode(enc), enc
        except UnicodeDecodeError:
            continue
    raise UserFacingError(
        code="invalid_encoding",
        message="Impossible de lire le fichier CSV (encodage non supporté). "
                "Essayez d’enregistrer le fichier en UTF-8.",
        status_code=400,
    )


def _detect_delimiter(sample: str) -> str:
    """
    Best-effort delimiter detection using csv.Sniffer.
    """
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=ALLOWED_DELIMITERS)
        if dialect.delimiter in ALLOWED_DELIMITERS:
            return dialect.delimiter
    except Exception:
        pass
    return ","


def _normalize_header(s: str) -> str:
    return " ".join(str(s).strip().split()).lower()


def parse_scoring_csv(data: bytes, filename: str = "uploaded.csv") -> dict:
    if len(data) > MAX_FILE_BYTES:
        raise UserFacingError(
            code="file_too_large",
            message=f"Fichier trop volumineux (max {MAX_FILE_BYTES // (1024 * 1024)}MB).",
            status_code=413,
        )

    text, encoding = _decode_bytes(data)
    sample = text[:4096]
    delimiter = _detect_delimiter(sample)

    # Read into DataFrame (engine='python' handles unusual separators better)
    try:
        df = pd.read_csv(io.StringIO(text), sep=delimiter, engine="python")
    except Exception as e:
        raise UserFacingError(
            code="csv_parse_error",
            message="Le fichier ne semble pas être un CSV valide ou ne correspond pas au format attendu.",
            details=str(e),
            status_code=400,
        )

    if df.shape[0] == 0 or df.shape[1] == 0:
        raise UserFacingError(
            code="empty_csv",
            message="Le fichier CSV est vide ou ne contient pas de données exploitables.",
            status_code=400,
        )

    if df.shape[0] > MAX_ROWS:
        raise UserFacingError(
            code="too_many_rows",
            message=f"Le fichier contient {df.shape[0]} lignes (max recommandé: {MAX_ROWS}). "
                    f"Réduisez la taille du fichier pour une visualisation fluide.",
            status_code=400,
        )

    # Clean headers
    original_cols = list(df.columns)
    clean_cols = [str(c).strip() for c in original_cols]
    df.columns = clean_cols

    # Identify tool_name column
    normalized = [_normalize_header(c) for c in clean_cols]
    tool_col_candidates = [i for i, n in enumerate(normalized) if n in ("tool_name", "tool", "toolname")]
    if not tool_col_candidates:
        raise UserFacingError(
            code="missing_tool_name",
            message="Colonne manquante: la première colonne doit s’appeler 'tool_name' (ou 'tool').",
            details={"found_columns": clean_cols},
            status_code=400,
        )
    tool_col_idx = tool_col_candidates[0]
    tool_col = clean_cols[tool_col_idx]

    # Steps: all columns except tool column
    step_cols = [c for c in clean_cols if c != tool_col]
    if len(step_cols) == 0:
        raise UserFacingError(
            code="missing_steps",
            message="Aucune colonne d’étape SDLC détectée. Attendu: 'tool_name' + au moins une colonne d’étape.",
            status_code=400,
        )

    # Enforce first column is tool_name as per spec, but be tolerant: warn if not first.
    warnings: List[str] = []
    if tool_col_idx != 0:
        warnings.append(
            f"La colonne '{tool_col}' a été utilisée comme identifiant d’outil, "
            f"mais elle n’est pas la première colonne."
        )

    # Strip tool names
    df[tool_col] = df[tool_col].astype(str).map(lambda x: x.strip())
    if (df[tool_col] == "").any():
        raise UserFacingError(
            code="empty_tool_name",
            message="Certaines lignes ont un 'tool_name' vide. Corrigez la colonne des noms d’outils.",
            status_code=400,
        )

    # Unique tools
    duplicated = df[df[tool_col].duplicated()][tool_col].tolist()
    if duplicated:
        raise UserFacingError(
            code="duplicate_tools",
            message="Des noms d’outils sont dupliqués. Chaque outil doit apparaître une seule fois.",
            details={"duplicates": sorted(set(duplicated))},
            status_code=400,
        )

    # Validate score columns are numeric (allow empty => NaN)
    score_df_raw = df[step_cols].copy()

    # Handle European decimal commas in a pragmatic way:
    # If delimiter is not comma, and there are strings like "3,5", we convert comma to dot.
    if delimiter != ",":
        def normalize_decimal(v):
            if isinstance(v, str):
                vv = v.strip()
                if "," in vv and "." not in vv:
                    # attempt decimal comma -> decimal point
                    return vv.replace(",", ".")
            return v
        score_df_raw = score_df_raw.applymap(normalize_decimal)

    score_df = score_df_raw.apply(pd.to_numeric, errors="coerce")

    # Detect non-numeric cells that were not empty
    non_empty_mask = score_df_raw.notna() & (score_df_raw.astype(str).map(lambda x: str(x).strip() != ""))
    bad_mask = non_empty_mask & score_df.isna()
    if bad_mask.any().any():
        bad_cells = []
        bad_positions = bad_mask.stack()
        for (row_idx, col_name), is_bad in bad_positions.items():
            if not is_bad:
                continue
            tool_name = str(df.iloc[row_idx][tool_col])
            raw_value = score_df_raw.iloc[row_idx][score_df_raw.columns.get_loc(col_name)]
            bad_cells.append({
                "tool": tool_name,
                "step": str(col_name),
                "value": None if pd.isna(raw_value) else str(raw_value),
                "row_index": int(row_idx) + 2,  # +2 accounts for header + 1-indexing
            })
            if len(bad_cells) >= 25:
                break

        raise UserFacingError(
            code="non_numeric_values",
            message="Certaines cellules contiennent des valeurs non numériques. "
                    "Vérifiez votre CSV (scores attendus: nombres).",
            details={
                "examples": bad_cells,
                "hint": "Si vous utilisez une virgule décimale (ex: 3,5), préférez un CSV séparé par ';'."
            },
            status_code=400,
        )

    # Compute min/max (ignore NaN)
    finite_values = score_df.stack().dropna()
    if finite_values.empty:
        raise UserFacingError(
            code="no_numeric_scores",
            message="Aucune valeur numérique détectée dans les colonnes de scores.",
            status_code=400,
        )
    min_score = float(finite_values.min())
    max_score = float(finite_values.max())

    # Build ordered outputs
    tool_names = df[tool_col].tolist()
    step_names = step_cols

    matrix = []
    for _, row in score_df.iterrows():
        matrix.append([None if pd.isna(v) else float(v) for v in row.tolist()])

    preview_df = df[[tool_col] + step_cols].head(PREVIEW_ROWS).copy()
    preview_df = preview_df.where(pd.notna(preview_df), None)

    preview_rows = preview_df.to_dict(orient="records")

    # Include a gentle warning if there are missing values
    if score_df.isna().any().any():
        warnings.append("Certaines valeurs sont manquantes (cellules vides). Elles seront ignorées ou affichées en blanc.")

    return {
        "toolNames": tool_names,
        "stepNames": step_names,
        "matrix": matrix,
        "minScore": min_score,
        "maxScore": max_score,
        "preview": {
            "columns": [tool_col] + step_cols,
            "rows": preview_rows,
        },
        "warnings": warnings,
        "meta": {
            "encoding": encoding,
            "delimiter": delimiter,
            "row_count": int(df.shape[0]),
            "step_count": int(len(step_cols)),
        },
    }
