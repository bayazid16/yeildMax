# YieldMax Deployment Guide

The application ships as **one container image** built from the project root.
That image builds the React/Vite frontend and runs the Django API alongside
Nginx. Docker Compose keeps PostgreSQL, Redis and Celery as separate services.

## 1. Configure environment

Create a gitignored `.env` in the project root (no example file is committed).
It must contain at minimum:

- `SECRET_KEY` — generate with
  `python -c "import secrets; print(secrets.token_urlsafe(50))"`
- `DB_PASSWORD` — the PostgreSQL password (used by both `db` and `app`)

Optionally include `DB_NAME`, `DB_USER`, `DEBUG`, `ALLOWED_HOSTS`, the LLM keys
and `SENTINEL_HUB_*` credentials listed below. Never commit `.env` or put API
keys/passwords in source control.
Optional providers:

| Variable | Purpose | Default |
|---|---|---|
| `GEMINI_API_KEY` | Google AI Studio key for the Bengali advisor | empty |
| `GEMINI_MODEL` | Gemini model used by the advisor | `gemini-3.5-flash-lite` |
| `OPENAI_API_KEY` | Optional alternative provider | empty |
| `OPENAI_MODEL` | OpenAI model if used | `gpt-3.5-turbo` |
| `LLM_TIMEOUT_SECONDS` | Per-request LLM timeout | `30` |
| `SENTINEL_HUB_CLIENT_ID` / `SENTINEL_HUB_CLIENT_SECRET` | Real satellite imagery (V2) | empty |
| `DEBUG` | Django debug mode | `0` in Compose |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts | `*` |
| `CORS_ALLOW_ALL_ORIGINS` / `CORS_ALLOWED_ORIGINS` | Cross-origin policy for a Vercel frontend | `1` / empty |
| `REDIS_URL` | Celery broker/result backend | `redis://redis:6379/0` |

Without LLM keys the advisor returns an honest Bengali fallback message.
Without Sentinel Hub credentials the V2 satellite endpoints return clearly
labelled prototype data.

## 2. Build and start

From the repository root:

```bash
docker compose up -d --build
```

The `app` entrypoint waits for PostgreSQL, applies migrations, seeds verified
crop guidelines, collects static files and then starts Django (gunicorn) and
Nginx under supervisord.

Open the app:

- Frontend + API: <http://localhost:8080>
- V2 routes: `/farm-map`, `/soil-weather`, `/satellite-ndvi`, `/crop-suitability`
- API health (via Nginx): <http://localhost:8080/api/health/>
- API health (direct Django): <http://localhost:8001/api/health/>

Build just the image:

```bash
docker build -t yieldmax-ai .
# Optional: point the built SPA at an external API
docker build --build-arg VITE_API_BASE_URL=https://api.example.com -t yieldmax-ai .
```

## 3. Make the chatbot answer

The advisor requires a farm **with a prediction**:

1. Go to `/farms` and create a farm (or use an existing one).
2. Go to `/predict` and generate a prediction for that farm.
3. Go to `/advisor`, select the farm, and ask a Bengali question.

Without a prediction the API intentionally returns `PREDICTION_NOT_FOUND`.

## 4. Troubleshooting

```bash
docker compose logs -f app       # both Django and Nginx logs
docker compose logs -f celery
docker compose ps
```

- **Bengali fallback message** — no LLM key was loaded; check `.env` and
  recreate the container (`docker compose up -d --force-recreate app`).
- **`PROVIDER_INIT_ERROR`** — the LangChain provider failed to initialize;
  rebuild so `backend/requirements.txt` is installed.
- **Model not found** — set `GEMINI_MODEL` to a model available to your key.
- **Frontend health badge offline** — check that the API is reachable at
  `/api/health/` and inspect `docker compose ps`.
- **CORS errors from Vercel** — set `CORS_ALLOWED_ORIGINS` on the backend to the
  Vercel domain and rebuild/restart it.

## 5. Local development without Docker

Start PostgreSQL/Redis (or point `DB_*` / `REDIS_URL` at your services), then:

```bash
cd backend
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

In another terminal:

```bash
cd frontend
npm ci
npm run dev
```

The Vite dev server proxies `/api` to `http://127.0.0.1:8000` (override with
`VITE_API_PROXY_TARGET`).

## 6. Vercel frontend

Set Vercel **Root Directory** to `frontend`; `frontend/vercel.json` contains the
SPA rewrite rule. Set `VITE_API_BASE_URL` in the Vercel project to the public
backend origin, then redeploy. See [README.md](README.md#2-vercel-deployment-frontend-only).
