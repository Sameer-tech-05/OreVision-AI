# OreVision AI

**AI-Driven Iron Ore Prospectivity Mapping Using Multisource Geospatial Data and XGBoost**

A 3rd-year Artificial Intelligence and Data Science engineering mini-project: a full-stack
web application that estimates iron ore prospectivity at a location from geospatial and
geological input features, using an XGBoost model, with an interactive GIS map and analytics.

> **Academic disclaimer:** This project is built for coursework demonstration. It is **not**
> a validated geological survey tool. No output from this application should be used for
> real mineral exploration, land-use, or investment decisions.

---

## 1. Features

- **Dashboard** — project overview, live API/model/data status, quick navigation.
- **AI Prediction** — form for magnetic anomaly, gravity anomaly, geological indicator,
  distance to fault, and remote sensing index, plus latitude/longitude; returns a
  prospectivity score with an explanation and disclaimer.
- **Interactive Map** — Leaflet/React-Leaflet map showing a sample prospectivity grid and
  every location you've scored this session, with a legend.
- **Analytics** — Recharts visualizations (score distribution, score-over-time,
  classification mix) built **only** from real predictions made in the current session.
  No fabricated accuracy/precision/recall/F1 numbers are shown anywhere.
- **Honest demo mode** — if no trained model file is present, the backend clearly marks
  every response as `model_mode: "demo"` and uses a documented, non-ML placeholder
  heuristic instead of pretending to be a validated model.

## 2. Technology stack

| Layer      | Technologies |
|------------|--------------|
| Frontend   | React 18, Vite, JavaScript ES6+, React Hooks, Lucide React icons |
| Backend    | Python 3, FastAPI, Uvicorn, Pydantic, REST, CORS |
| ML         | XGBoost, NumPy, Pandas, Scikit-learn, Joblib |
| GIS / Viz  | Leaflet.js, React-Leaflet, GeoJSON-ready grid endpoint, Recharts |

## 3. Architecture

```
Browser (React SPA)
   │  fetch("/api/...")  — proxied by Vite dev server to :8000
   ▼
FastAPI backend
   ├── /api/health   → model + API status
   ├── /api/predict  → single-point prospectivity score (XGBoost or demo heuristic)
   └── /api/grid     → sample grid of points for map visualization
   │
   ▼
ProspectivityModel (app/model.py)
   ├── loads backend/models/iron_ore_xgb_model.joblib if present ("trained" mode)
   └── falls back to a documented heuristic if not ("demo" mode)
```

## 4. Folder structure

```
OreVision-AI/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx / Navbar.css
│   │   │   ├── Dashboard.jsx / Dashboard.css
│   │   │   ├── PredictionForm.jsx / PredictionForm.css
│   │   │   ├── PredictionResult.jsx / PredictionResult.css
│   │   │   ├── ProspectivityMap.jsx / ProspectivityMap.css
│   │   │   ├── Analytics.jsx / Analytics.css
│   │   │   └── Footer.jsx / Footer.css
│   │   ├── services/api.js
│   │   ├── App.jsx / App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── eslint.config.js
├── backend/
│   ├── app/
│   │   ├── main.py       — FastAPI app and routes
│   │   ├── schemas.py    — Pydantic request/response models
│   │   ├── model.py      — model loading + prediction logic
│   │   ├── train.py      — training script (bring your own dataset)
│   │   └── services/     — reserved for future service modules
│   ├── data/README.md    — dataset requirements (no data bundled)
│   ├── models/README.md  — where a trained model file goes
│   ├── requirements.txt
│   └── .env.example
├── README.md
└── .gitignore
```

## 5. Installation

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # optional, adjust CORS/host/port if needed
uvicorn app.main:app --reload --port 8000
```

The API is now at `http://localhost:8000`, with interactive Swagger docs at
`http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app is now at `http://localhost:5173`. The Vite dev server proxies `/api/*` requests to
`http://localhost:8000` (see `vite.config.js`), so make sure the backend is running first.

### Production build

```bash
cd frontend
npm run build     # outputs static files to frontend/dist/
npm run preview   # serve the production build locally
```

## 6. API endpoints

| Method | Path            | Description |
|--------|-----------------|-------------|
| GET    | `/`             | Basic API info |
| GET    | `/api/health`   | Health check; reports `model_loaded` and `model_mode` (`trained`/`demo`) |
| POST   | `/api/predict`  | Predict prospectivity for one location |
| GET    | `/api/grid`     | Grid of sample points for map display (`min_lat`, `max_lat`, `min_lon`, `max_lon`, `step` query params) |

### `POST /api/predict` request body

```json
{
  "latitude": 22.35,
  "longitude": 85.32,
  "magnetic_anomaly": 145.6,
  "gravity_anomaly": 12.4,
  "geological_indicator": 0.72,
  "distance_to_fault_km": 3.1,
  "remote_sensing_index": 0.45
}
```

### Response

```json
{
  "prospectivity_score": 0.6132,
  "classification": null,
  "latitude": 22.35,
  "longitude": 85.32,
  "model_name": "OreVision-XGBoost-IronOre-Prospectivity",
  "model_mode": "demo",
  "timestamp": "2026-09-23T12:00:00Z",
  "explanation": "No trained model file was found on the server, so this score was produced by a simple documented demo heuristic, NOT by XGBoost. Train and place a model file to get real predictions (see README 'Model setup').",
  "disclaimer": "This output is generated for an academic mini-project. It is NOT a validated geological survey result and must not be used for real exploration, investment, or land-use decisions."
}
```

`classification` is only populated (`"High prospectivity"` / `"Moderate prospectivity"` /
`"Low prospectivity"`) when `model_mode` is `"trained"` — the demo heuristic is not treated
as trustworthy enough to classify.

## 7. Model setup

No trained model ships with this project (see **Limitations** below). On startup,
`app/model.py` looks for `backend/models/iron_ore_xgb_model.joblib`:

- **Missing** → the API runs in demo mode. Every prediction is labeled
  `model_mode: "demo"` and computed by a small, documented, transparent heuristic
  (see `ProspectivityModel._demo_heuristic` in `app/model.py`) — it is explicitly not
  an XGBoost prediction and is never presented as one.
- **Present** → the API loads it and runs real XGBoost predictions, labeled
  `model_mode: "trained"`.

### Training a real model

```bash
cd backend
python -m app.train --data data/your_labelled_dataset.csv
```

See `backend/data/README.md` and the docstring at the top of `backend/app/train.py` for the
exact CSV schema required (`magnetic_anomaly, gravity_anomaly, geological_indicator,
distance_to_fault_km, remote_sensing_index, label`). The feature order in that file **must**
match `FEATURE_ORDER` in `app/model.py` — this is the single source of truth used by both
training and inference, so the two never drift out of sync.

### Dataset requirements

- CSV with a header row and the six columns listed above.
- `label` is either a continuous prospectivity score in `[0, 1]` (regression, the default)
  or a binary 0/1 class (pass `--classification` to `train.py`).
- This project does **not** ship with real geological ground-truth data — iron ore
  prospectivity datasets are typically proprietary to survey organizations. You'll need to
  source or construct your own (e.g. from a geological survey department, a published
  research dataset, or synthetic data for coursework purposes) before training a
  scientifically meaningful model.

## 8. Testing actually performed

Given the constraints of the environment this project was generated in (no outbound
network access, so `pip install` / `npm install` could not be run against PyPI/npm), the
following checks **were** actually performed, and nothing beyond this is claimed:

- **Backend:** every Python file (`main.py`, `schemas.py`, `model.py`, `train.py`,
  `__init__.py`) was compiled with `python3 -m py_compile` — all passed with no syntax
  errors.
- **Frontend:** every `.jsx`/`.js` source file was parsed with the TypeScript compiler in
  `--allowJs --jsx react-jsx` mode as a syntax checker — all passed with no syntax errors.
- **Not performed:** a live `pip install -r requirements.txt`, `uvicorn` boot test against
  real HTTP requests, `npm install`, or `npm run build`, because this environment has no
  network access to fetch packages from PyPI/npm.

**Before you rely on this project, run these yourself** (see Installation above):

```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
curl http://localhost:8000/api/health
curl -X POST http://localhost:8000/api/predict -H "Content-Type: application/json" \
  -d '{"latitude":22.35,"longitude":85.32,"magnetic_anomaly":145.6,"gravity_anomaly":12.4,"geological_indicator":0.72,"distance_to_fault_km":3.1,"remote_sensing_index":0.45}'
curl -X POST http://localhost:8000/api/predict -H "Content-Type: application/json" -d '{}'   # should return 422

# Frontend
cd frontend && npm install && npm run build
```

## 9. Limitations

- No real, labelled iron ore prospectivity dataset is bundled — the shipped API runs in
  demo mode until you train and supply a real model (see §7).
- The demo heuristic is a simple, transparent formula for UI/demo purposes only. It is
  **not** a machine-learning model and has no predictive validity.
- The map's grid endpoint uses synthetic coordinate-derived inputs when no real dataset is
  configured, and is clearly labeled `is_demo_data: true` in that case.
- No authentication, rate limiting, or persistence layer (predictions are kept only in
  frontend session state, not saved server-side).
- This project was not installed or run end-to-end in the generating environment due to no
  network access; see §8 for exactly what was and wasn't verified.

## 10. Future scope

- Integrate a real, published iron-ore prospectivity dataset and retrain with proper
  cross-validation and hyperparameter tuning.
- Add persistence (a database) for prediction history instead of in-memory session state.
- Add SHAP-based feature-importance explanations per prediction.
- Support GeoTIFF/raster layers (real magnetic/gravity survey rasters) on the map instead
  of a synthetic point grid.
- Add authentication and per-user prediction history.

## 11. Academic disclaimer

This project was created for academic demonstration as part of a 3rd-year Artificial
Intelligence and Data Science engineering mini-project. It does not represent a validated
scientific or commercial mineral exploration tool, and none of its outputs should be used
for real-world exploration, investment, or land-use decisions.
#   O r e V i s i o n - A I  
 #   O r e V i s i o n - A I  
 #   O r e V i s i o n - A I  
 