FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching (if exists)
# If requirements.txt doesn't exist, install common dependencies
COPY requirements.txt* ./
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; else pip install --no-cache-dir fastapi uvicorn sqlalchemy psycopg2-binary pydantic pydantic-settings python-jose[cryptography] bcrypt python-multipart alembic httpx PyPDF2 python-docx python-pptx; fi

# Copy application code (.env is excluded via .dockerignore; mounted at runtime)
COPY . .

# Create storage directory
RUN mkdir -p storage

# Expose ports
EXPOSE 8001 8443

# Run migrations and start server
# Wait for database to be ready, then run migrations and start server
# SSL certificates will be mounted as volume if HTTPS is enabled
CMD ["sh", "-c", "until pg_isready -h sales-enablement-db -p 5432 -U ${POSTGRES_USER:-postgres}; do sleep 2; done && (alembic upgrade head || echo 'Migration warning - continuing anyway') && if [ -f /app/ssl/ssl.crt ]; then uvicorn app.main:app --host 0.0.0.0 --port 8443 --ssl-keyfile /app/ssl/ssl.key --ssl-certfile /app/ssl/ssl.crt & uvicorn app.main:app --host 0.0.0.0 --port 8001; else uvicorn app.main:app --host 0.0.0.0 --port 8001; fi"]
