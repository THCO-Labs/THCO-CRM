# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1 — build the React bundle
# ---------------------------------------------------------------------------
FROM node:20-slim AS frontend

WORKDIR /app/frontend

# Install dependencies from the lockfile first so this layer caches across
# source-only changes.
COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000

# Copied in three layers, cheapest-changing first. public/ is 268MB of images,
# video and PDFs that almost never change, while src/ is 3.4MB that changes
# constantly -- copying them together meant every code edit invalidated and
# re-pushed the whole 268MB.
COPY frontend/public ./public
COPY frontend/craco.config.js frontend/tailwind.config.js frontend/postcss.config.js \
     frontend/jsconfig.json frontend/components.json ./
COPY frontend/plugins ./plugins
COPY frontend/src ./src

# REACT_APP_BACKEND_URL is deliberately left unset: the API is served from the
# same origin as this bundle in production, so api.js resolves to a relative
# /api path. Setting it here would bake in a hostname and break the deploy.
ENV NODE_ENV=production
RUN yarn build


# ---------------------------------------------------------------------------
# Stage 2 — Python runtime serving the API and the built bundle
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS runtime

# System packages the CV parser needs and pip cannot provide:
#   tesseract-ocr  -> pytesseract, OCR fallback for scanned PDFs
#   poppler-utils  -> pdf2image, rasterises PDF pages for that OCR pass
# Without these the parser still handles text PDFs and DOCX; scanned documents
# silently yield empty text.
RUN apt-get update && apt-get install -y --no-install-recommends \
        tesseract-ocr \
        poppler-utils \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ ./backend/

# server.py resolves the SPA at ../frontend/build relative to itself.
COPY --from=frontend /app/frontend/build ./frontend/build

# Run as a non-root user.
RUN useradd --create-home --uid 10001 appuser \
    && mkdir -p /app/backend/uploads /app/backend/static_assets \
    && chown -R appuser:appuser /app
USER appuser

# Stamped by the deploy with the commit being built, and reported by
# /api/version. Without it, whether a deploy actually reached production can
# only be inferred from behaviour -- which is how two commits sat "deployed"
# for an afternoon while the old code kept serving.
ARG BUILD_SHA=unknown
ARG BUILD_TIME=unknown

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    TESSERACT_CMD=/usr/bin/tesseract \
    BUILD_SHA=${BUILD_SHA} \
    BUILD_TIME=${BUILD_TIME}

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS "http://127.0.0.1:${PORT}/healthz" || exit 1

WORKDIR /app/backend

# Bind to the port the platform assigns. Azure App Service injects PORT (and
# honours WEBSITES_PORT) and routes traffic only there.
CMD ["sh", "-c", "exec uvicorn server:app --host 0.0.0.0 --port ${PORT:-${WEBSITES_PORT:-8000}}"]
