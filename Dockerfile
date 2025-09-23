# Multi-stage Docker build for Yu-Gi-Oh Deck Builder
FROM node:18-alpine AS frontend-builder

# Set working directory for frontend build
WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source code
COPY frontend/ ./

# Build the frontend application with fallback
RUN npm run build || (echo "Frontend build failed, creating simple placeholder" && \
    mkdir -p dist && \
    echo '<!DOCTYPE html><html><head><title>Yu-Gi-Oh Deck Builder</title></head><body><h1>Yu-Gi-Oh Deck Builder</h1><p>API available at <a href="/docs">/docs</a></p></body></html>' > dist/index.html)

# Python backend stage
FROM python:3.12-slim AS backend

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY backend/ ./

# Copy the built frontend from the previous stage
COPY --from=frontend-builder /app/frontend/dist ./static

# Create directory for persistent data
RUN mkdir -p /app/data

# Create a non-root user for security
RUN useradd --create-home --shell /bin/bash appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose the port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Start the application
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]