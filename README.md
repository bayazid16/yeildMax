# YieldMax-AI

AI-powered crop yield prediction and optimization using machine learning,
satellite imagery, weather, and soil data.

The repository contains:

- `backend/` — Django REST Framework APIs (V1 yield/advisor + V2 geo, satellite,
  weather and soil endpoints), Celery tasks and management commands.
- `frontend/` — React + Vite SPA (V1 dashboard and V2 feature pages).
- `Dockerfile` — **single image** that builds the frontend and runs Django +
  Nginx together.
- `docker-compose.yml` — that single image plus PostgreSQL, Redis and Celery.

## 1. Docker deployment (recommended)

Everything can be built from the project root:

```bash
# Create a gitignored .env with at least SECRET_KEY and DB_PASSWORD
# (see DEPLOYMENT.md for the full variable list), then start the stack:
docker compose up -d --build
```

Open <http://localhost:8080>. The SPA and the API are served by the same
container:

| URL | Purpose |
|---|---|
| <http://localhost:8080/> | React dashboard |
| <http://localhost:8080/farm-map> | V2 farm mapping |
| <http://localhost:8080/soil-weather> | V2 soil & weather |
| <http://localhost:8080/satellite-ndvi> | V2 satellite NDVI |
| <http://localhost:8080/crop-suitability> | V2 crop suitability |
| <http://localhost:8080/api/health/> | Django API health |
| <http://localhost:8001/api/health/> | Django direct (debug port) |

To build the image on its own:

```bash
docker build -t yieldmax-ai .
```

The image builds the React app with `npm ci && npm run build`, installs the
Python requirements into `/opt/venv`, and starts **gunicorn** (Django on
`0.0.0.0:8000`) plus **Nginx** (SPA on `:80`, `/api/` reverse proxy) under
supervisord. No API keys, passwords or Django secret keys are baked into the
image; they are injected from `.env` at runtime.

Useful commands:

```bash
docker compose logs -f app        # Django + Nginx output
docker compose logs -f celery     # Celery worker
docker compose ps
docker compose down               # add -v to remove database volumes
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for environment variables, troubleshooting
and local development.

## 2. Vercel deployment (frontend only)

The frontend is a Vite SPA and can be deployed to Vercel independently, with
the Django API hosted elsewhere.

1. In Vercel, import the repository and set **Root Directory** to `frontend`.
   `frontend/vercel.json` supplies the Vite build settings and the SPA rewrite
   rule, so client-side routes such as `/farm-map`, `/soil-weather`,
   `/satellite-ndvi` and `/crop-suitability` work on refresh.
2. In **Project → Settings → Environment Variables**, add:

   | Variable | Value |
   |---|---|
   | `VITE_API_BASE_URL` | Full backend origin, e.g. `https://api.example.com` (no trailing `/api`). Leave empty only if the backend is exposed at the same origin's `/api` path. |

   `VITE_*` variables are embedded at build time, so redeploy after changing
   them. No API keys belong here — the Vercel site only calls the backend.
3. On the backend, make sure the Vercel origin is allowed:
   `CORS_ALLOW_ALL_ORIGINS=0` and
   `CORS_ALLOWED_ORIGINS=https://your-app.vercel.app` (comma-separated for
   multiple origins).

All API calls go through the centralized Axios client in `frontend/src/api.ts`,
which reads `VITE_API_BASE_URL`. Leaflet map tiles/icons are the only external
third-party URLs (OpenStreetMap and unpkg).

## 3. Local development without Docker

```bash
# backend
cd backend
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000

# frontend (separate terminal)
cd frontend
npm ci
npm run dev
```

The Vite dev server proxies `/api` to `http://127.0.0.1:8000` by default. Override
with `VITE_API_PROXY_TARGET` if Django runs on a different address.
