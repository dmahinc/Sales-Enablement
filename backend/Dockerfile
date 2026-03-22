FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (LibreOffice for PPTX/DOCX thumbnail conversion)
RUN apt-get update && apt-get install -y \
    postgresql-client \
    gcc \
    libreoffice \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt* ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create storage directories
RUN mkdir -p storage storage/avatars storage/deal_room_logos

EXPOSE 8001 8443

# Wait for database, run migrations, start server
CMD ["sh", "-c", "until pg_isready -h sales-enablement-db -p 5432 -U ${POSTGRES_USER:-postgres}; do sleep 2; done && (alembic upgrade head || echo 'Migration warning - continuing anyway') && uvicorn app.main:app --host 0.0.0.0 --port 8001"]
