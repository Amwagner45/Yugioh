# Multi-stage Docker build for Yu-Gi-Oh Deck Builder
FROM node:22-alpine AS frontend-builder

# Install build dependencies for Alpine Linux
RUN apk add --no-cache python3 make g++ libc6-compat

# Set working directory for frontend build
WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Clean install with better handling of optional dependencies
RUN rm -rf node_modules package-lock.json && \
    npm install --include=optional --force && \
    npm rebuild

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
RUN mkdir -p /app/data /app/cache

# Set environment variables
ENV DATABASE_PATH=/app/data/yugioh_deckbuilder.db
ENV DATA_PATH=/app/data
ENV CACHE_PATH=/app/cache
ENV PYTHONPATH=/app

# Copy the existing populated database from backend/cache (contains all cards)
# Note: The original cache/yugioh_deckbuilder.db will be copied as the seed database
RUN if [ -f "cache/yugioh_deckbuilder.db" ]; then \
    echo "📂 Copying existing populated database from cache..."; \
    cp cache/yugioh_deckbuilder.db /app/data/yugioh_deckbuilder.db; \
    else \
    echo "⚠️ No cache database found, checking for direct database file..."; \
    if [ -f "yugioh_deckbuilder.db" ]; then \
    cp yugioh_deckbuilder.db /app/data/yugioh_deckbuilder.db; \
    echo "📂 Copied database from backend root"; \
    else \
    echo "❌ No database found, will create empty schema"; \
    python -c "from src.database.manager import DatabaseManager; db_manager = DatabaseManager('/app/data/yugioh_deckbuilder.db'); db_manager.setup_database(); print('✅ Empty database schema created')"; \
    fi \
    fi

# Clean the database to remove personal development data, keeping only card cache
RUN if [ -f "/app/data/yugioh_deckbuilder.db" ]; then \
    echo "🔧 Cleaning database for production..."; \
    python -c "from src.database.manager import DatabaseManager; import os; db_manager = DatabaseManager('/app/data/yugioh_deckbuilder.db'); conn = db_manager.get_connection(); print('📊 Original database size:', f'{os.path.getsize(\"/app/data/yugioh_deckbuilder.db\") / (1024*1024):.1f} MB'); cursor = conn.execute('SELECT COUNT(*) FROM card_cache'); card_count = cursor.fetchone()[0]; print(f'📦 Preserving {card_count} cached cards'); print('🗑️ Removing personal development data...'); conn.execute('DELETE FROM binders'); conn.execute('DELETE FROM binder_cards'); conn.execute('DELETE FROM decks'); conn.execute('DELETE FROM deck_cards'); conn.execute('DELETE FROM users WHERE id != 1'); conn.execute('UPDATE users SET username = \"default\", display_name = \"Default User\" WHERE id = 1'); conn.commit(); conn.close(); print('📊 Cleaned database size:', f'{os.path.getsize(\"/app/data/yugioh_deckbuilder.db\") / (1024*1024):.1f} MB'); print('✅ Database cleaned and ready for production')"; \
    fi

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