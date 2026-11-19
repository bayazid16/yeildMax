# YieldMax Deployment Guide

This project runs as four Docker Compose services: PostgreSQL, Redis, the Django
backend, and the Nginx-served React frontend.

## 1. Configure environment

A gitignored `.env` file already exists in the project root. It contains the
Gemini key you supplied.

Never put API keys in `.env.example` or commit `.env`.

Relevant variables:

| Variable | Purpose | Default |
|---|---|---|
| `GEMINI_API_KEY` | Google AI Studio key for the Bengali advisor | empty |
| `GEMINI_MODEL` | Gemini model used by the advisor | `gemini-3.5-flash-lite` |
| `OPENAI_API_KEY` | Optional alternative provider | empty |
| `OPENAI_MODEL` | OpenAI model if used | `gpt-3.5-turbo` |
| `LLM_TIMEOUT_SECONDS` | Per-request LLM timeout | `30` |
| `SECRET_KEY` | Django secret key | development default |
| `DEBUG` | Django debug mode | `1` (set to `0` in production) |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts | `*` |
| `DB_*` | PostgreSQL connection settings | see `.env.example` |
| `REDIS_URL` | Celery broker/result backend | `redis://redis:6379/0` |

If your Gemini key cannot access `gemini-3.5-flash-lite`, change `GEMINI_MODEL`
in `.env` (for example to `gemini-3.8-flash`) before starting the stack.

## 2. Build and start

```bash
docker compose up -d --build
```

The backend entrypoint waits for PostgreSQL, runs migrations, seeds verified
crop guidelines, and starts Django on port `8000`.

Open the app:

- Frontend: <http://localhost:8080>
- Advisor page: <http://localhost:8080/advisor>
- API health: <http://localhost:8000/api/health/>

## 3. Make the chatbot answer

The advisor requires a farm **with a prediction**:

1. Go to `/farms` and create a farm (or use an existing one).
2. Go to `/predict` and generate a prediction for that farm.
3. Go to `/advisor`, select the farm, and ask a Bengali question.

Without a prediction the API intentionally returns `PREDICTION_NOT_FOUND`.

## 4. Troubleshooting

Check logs:

```bash
docker compose logs -f backend
```

Common states:

- **Bengali fallback message** — no key was loaded, or the provider could not
  initialize. Confirm `.env` is in the project root and restart with
  `docker compose up -d --build backend`.
- **`PROVIDER_INIT_ERROR` in logs/response** — the LangChain provider failed to
  initialize (usually a missing package or bad model config). Rebuild the image
  so `backend/requirements.txt` is installed.
- **Model not found** — set `GEMINI_MODEL` to a model available to your key.
- **Frontend health badge offline** — the backend is not reachable; check
  `docker compose ps`.

## 5. Local development without Docker

Start PostgreSQL/Redis (or point `DB_*` / `REDIS_URL` at your services), then:

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` to `http://127.0.0.1:8000`.
