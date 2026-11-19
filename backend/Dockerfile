# Multi-stage Dockerfile for YieldMax Backend (Django REST Framework)
# Python 3.11-slim, non-root user, cached requirements layer, entrypoint script

# ---- Build Stage ----
FROM python:3.11-slim AS builder

# Install build dependencies (curl, gcc for psycopg if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser -m -s /bin/bash appuser

# Copy requirements first for cached dependency layer
COPY requirements.txt .
RUN pip install --no-cache-dir pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy project source code
COPY . .

# ---- Runtime Stage ----
FROM python:3.11-slim AS runtime

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Create same non-root user in runtime
RUN groupadd -r appuser && useradd -r -g appuser -m -s /bin/bash appuser

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy project source code and entrypoint
COPY --from=builder /app .

# Copy entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

USER appuser

# Expose the Django development server port
EXPOSE 8000

ENTRYPOINT ["sh", "/app/entrypoint.sh"]