# Docker Setup Guide

This guide explains how to run the Products & Solutions Enablement Platform using Docker.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Sales-Enablement
```

### 2. Configure Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:
- `SECRET_KEY` - Generate a secure random string (see below)
- `SMTP_*` settings if you want email notifications

**Generate SECRET_KEY:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 3. Start Services

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database (port 5432)
- Backend API (port 8001)
- Frontend (port 3003)

### 4. Initialize Database

The backend will automatically run migrations on startup. To verify:

```bash
docker-compose logs backend
```

### 5. Access the Application

- **Frontend:** http://localhost:3003
- **Backend API:** http://localhost:8001
- **API Docs:** http://localhost:8001/docs

## Services

### Database (PostgreSQL)

- **Container:** `sales-enablement-db`
- **Port:** 5432 (configurable via `POSTGRES_PORT`)
- **Data:** Persisted in Docker volume `postgres_data`

### Backend (FastAPI)

- **Container:** `sales-enablement-backend`
- **Port:** 8001 (configurable via `BACKEND_PORT`)
- **Storage:** Mounted from `./backend/storage`

### Frontend (React + Nginx)

- **Container:** `sales-enablement-frontend`
- **Port:** 3003 (configurable via `FRONTEND_PORT`)
- **Build:** Production build served by Nginx

## Common Commands

### Start services
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose down
```

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Restart a service
```bash
docker-compose restart backend
```

### Rebuild after code changes
```bash
docker-compose up -d --build
```

### Access database
```bash
docker-compose exec db psql -U postgres -d sales_enablement
```

### Run database migrations manually
```bash
docker-compose exec backend alembic upgrade head
```

### Create admin user
```bash
docker-compose exec backend python create_admin.py
```

## Environment Variables

See `.env.example` for all available configuration options.

### Required Variables

- `SECRET_KEY` - JWT secret key (must be set)

### Optional Variables

- `POSTGRES_USER` - Database user (default: postgres)
- `POSTGRES_PASSWORD` - Database password (default: postgres)
- `POSTGRES_DB` - Database name (default: sales_enablement)
- `SMTP_*` - Email configuration (optional)

## Volumes

- `postgres_data` - PostgreSQL data persistence
- `./backend/storage` - File storage (materials, documents)

## Networking

All services are on the `sales-enablement-network` bridge network:
- Backend can access database via `db:5432`
- Frontend can access backend via `backend:8001`

## Troubleshooting

### Database connection errors

Check if database is healthy:
```bash
docker-compose ps
```

View database logs:
```bash
docker-compose logs db
```

### Backend won't start

Check logs:
```bash
docker-compose logs backend
```

Common issues:
- Missing `SECRET_KEY` in `.env`
- Database not ready (wait for health check)
- Port already in use

### Frontend can't connect to backend

Check `VITE_API_URL` in `.env` matches your setup:
- Docker: `http://localhost:8001/api`
- Or use backend service name: `http://backend:8001/api` (for internal communication)

### Reset everything

```bash
# Stop and remove containers, networks, volumes
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Start fresh
docker-compose up -d --build
```

## Production Considerations

For production deployment:

1. **Change default passwords** - Update `POSTGRES_PASSWORD` and use strong `SECRET_KEY`
2. **Use secrets management** - Don't commit `.env` file
3. **Configure HTTPS** - Add reverse proxy (Traefik, Nginx) with SSL
4. **Set up backups** - Backup PostgreSQL volume regularly
5. **Resource limits** - Add resource limits to docker-compose.yml
6. **Health checks** - Already configured, monitor them
7. **Logging** - Configure log aggregation
8. **Monitoring** - Add monitoring tools

## Development Mode

For development with hot-reload:

```bash
# Backend (with reload)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or run locally while using Docker database
docker-compose up db -d
# Then run backend/frontend locally
```

## Backup & Restore

### Backup database
```bash
docker-compose exec db pg_dump -U postgres sales_enablement > backup.sql
```

### Restore database
```bash
docker-compose exec -T db psql -U postgres sales_enablement < backup.sql
```
