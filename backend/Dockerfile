# Stage 1: Build dependencies
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app
COPY requirements.txt .

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && \
    pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt

# Stage 2: Runtime
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 curl && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/wheels /wheels
COPY --from=builder /app/requirements.txt .
RUN pip install --no-cache /wheels/*

COPY . .
COPY entrypoint.sh .
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health/live/ || exit 1

# Start via entrypoint script to run migrations and create admin
ENTRYPOINT ["./entrypoint.sh"]
