# IA SDLC Scoring Visualizer

Application web (SPA) pour visualiser une matrice de scoring d’outils IA sur les différentes étapes d’un SDLC (heatmap + radar/spider chart).

## Stack et justification (court)

- **Backend**: **Python + FastAPI**
  - Parsing/validation robuste du CSV (encodage, délimiteur, colonnes, valeurs numériques).
  - API simple (`/api/upload`) adaptée à un usage “outil interne”.
- **Frontend**: **React + TypeScript + Vite**
  - SPA moderne, rapide à lancer en local, typage strict pour fiabiliser la manipulation de données.
- **Design**: **Tailwind CSS**
  - Mise en forme rapide, cohérente et “enterprise-grade” (dominante bleu, accent rouge).
- **Data viz**: **Plotly.js**
  - Une seule librairie pour **heatmap** et **radar**, tooltips natifs, légende interactive (masquer/afficher des séries).

## Format CSV attendu

- **Première ligne**: en-têtes.
- **Première colonne**: `tool_name` (ou `tool`) = nom de l’outil IA.
- **Colonnes suivantes**: une colonne par étape SDLC (nom libre).
- **Cellules**: scores numériques (ex: 0–5, 0–100). Les cellules vides sont acceptées.

Exemple :

```csv
tool_name,Business understanding,Data acquisition,Modeling,Validation,Deployment,Monitoring
ChatGPT,4,3,5,4,3,3
Copilot,2,1,4,3,2,2
```

Notes:
- Le backend détecte automatiquement le délimiteur parmi `, ; tab |`.
- Si vous utilisez une virgule décimale (ex: `3,5`), préférez un CSV séparé par `;`.

## Prérequis

- **Python** 3.10+ (3.11 recommandé)
- **Node.js** 18+ (20 recommandé)
- (Optionnel) `make`, `bash` pour les scripts

## Démarrage (dev)

### 1) Backend (FastAPI)

```bash
cd backend

python -m venv .venv
# Linux/macOS
source .venv/bin/activate
# Windows (PowerShell)
# .\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API:
- `GET http://localhost:8000/api/health`
- `POST http://localhost:8000/api/upload` (multipart file)
- `GET http://localhost:8000/api/sample` (données d’exemple)

### 2) Frontend (React)

Dans un autre terminal :

```bash
cd frontend
npm install
npm run dev
```

Ouvrir: `http://localhost:5173`

Le serveur Vite proxy automatiquement `/api/*` vers `http://localhost:8000`.

## Script “one-shot” (Linux/macOS)

Optionnel :

```bash
./scripts/start-dev.sh
```

## Données d’exemple

- `sample_data/example_scoring.csv`
- Dans l’UI, bouton **“Charger un exemple”** (appelle `/api/sample`).

## Comportements UX importants

- **Heatmap**: filtre outils/étapes + plage de score (valeurs hors plage masquées).
- **Radar**: filtre outils/étapes + “max outils affichés” + mode focus.
  - Les valeurs manquantes (`N/A`) sont tracées à **0** pour fermer les polygones, mais restent visibles au survol.

## Structure du projet

- `backend/` : API FastAPI (validation, parsing, endpoint sample)
- `frontend/` : SPA React + Plotly + Tailwind
- `sample_data/` : CSV d’exemple
- `scripts/` : script de démarrage (optionnel)
