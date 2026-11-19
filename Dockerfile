# syntax=docker/dockerfile:1
#
# YieldMax-AI — single-container image.
# Builds the React/Vite frontend and bundles the Django backend.
# Nginx serves the SPA and proxies /api/ to gunicorn on 127.0.0.1:8000.
# Build from the PROJECT ROOT:  docker build -t yieldmax-ai .
# No secrets are baked into the image; everything comes from the environment.

# ---------------------------------------------------------------------------
# Stage 1 — build the React frontend
# ---------------------------------------------------------------------------
FROM node:22-alpine AS frontend-build

WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ .

# Empty (default) = same-origin relative /api URLs, proxied by Nginx.
# Set VITE_API_BASE_URL to the full backend origin when the API is on
# another domain (for example a standalone Vercel frontend deployment).
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2 — build Python dependencies into a virtualenv
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS python-build

RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY backend/requirements.txt ./requirements.txt
RUN python -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir --upgrade pip \
    && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# ---------------------------------------------------------------------------
# Stage 3 — runtime (Django + Nginx via supervisord)
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:${PATH}" \
    PYTHONPATH=/app \
    DJANGO_SETTINGS_MODULE=config.settings \
    STATIC_ROOT=/var/www/static \
    YIELDMAX_MULTI_PROCESS=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        nginx \
        postgresql-client \
        supervisor \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/nginx/sites-enabled/default \
    && mkdir -p /var/www/yieldmax /var/www/static /var/log/supervisor

WORKDIR /app

COPY --from=python-build /opt/venv /opt/venv
COPY backend/ /app/
COPY --from=frontend-build /frontend/dist /var/www/yieldmax

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/yieldmax.conf

RUN chmod +x /app/entrypoint.sh

# 80  -> React SPA + proxied API (single public entry point)
# 8000 -> Django directly (handy for health checks / debugging)
EXPOSE 80 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=5 \
    CMD curl -fsS http://127.0.0.1/api/health/ >/dev/null || exit 1

ENTRYPOINT ["sh", "/app/entrypoint.sh"]
