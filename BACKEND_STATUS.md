# Backend Status

**Last Updated:** February 2, 2026  
**Status:** ✅ **RUNNING**

---

## Backend Server

**URL:** http://localhost:8001  
**Status:** ✅ Running  
**Process ID:** Check with `ps aux | grep uvicorn`

---

## Quick Health Check

```bash
# Check if backend is running
curl http://localhost:8001/health

# Should return:
# {"status":"healthy"}
```

---

## API Endpoints

### Base URL
```
http://localhost:8001/api
```

### Available Endpoints

**Authentication:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get token
- `GET /api/auth/me` - Get current user

**Materials:**
- `GET /api/materials` - List materials
- `POST /api/materials` - Create material
- `GET /api/materials/{id}` - Get material
- `PUT /api/materials/{id}` - Update material
- `DELETE /api/materials/{id}` - Delete material
- `POST /api/materials/upload` - Upload file
- `GET /api/materials/{id}/download` - Download file

**Personas:**
- `GET /api/personas` - List personas
- `POST /api/personas` - Create persona
- `GET /api/personas/{id}` - Get persona
- `PUT /api/personas/{id}` - Update persona
- `DELETE /api/personas/{id}` - Delete persona

**Segments:**
- `GET /api/segments` - List segments
- `POST /api/segments` - Create segment
- `GET /api/segments/{id}` - Get segment
- `PUT /api/segments/{id}` - Update segment
- `DELETE /api/segments/{id}` - Delete segment

**Health:**
- `GET /api/health/metrics` - Health metrics

**Discovery:**
- `GET /api/discovery/search` - Search content

---

## API Documentation

**Swagger UI:** http://localhost:8001/docs  
**ReDoc:** http://localhost:8001/redoc

---

## Starting the Backend

```bash
cd backend
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

Or run in background:
```bash
cd backend
nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload > /tmp/backend.log 2>&1 &
```

---

## Stopping the Backend

```bash
# Find process
ps aux | grep uvicorn

# Kill process
pkill -f "uvicorn.*8001"
```

---

## Logs

**Log file:** `/tmp/backend.log` (if started with nohup)

**View logs:**
```bash
tail -f /tmp/backend.log
```

---

## Troubleshooting

### Backend won't start

1. **Check SECRET_KEY:**
   ```bash
   cd backend
   grep SECRET_KEY .env
   ```

2. **Check database connection:**
   ```bash
   psql -h localhost -p 5434 -U postgres -d sales_enablement -c "SELECT 1;"
   ```

3. **Check port availability:**
   ```bash
   lsof -i :8001
   ```

### Backend starts but endpoints fail

1. **Check database migrations:**
   ```bash
   cd backend
   alembic current
   alembic upgrade head
   ```

2. **Check logs:**
   ```bash
   tail -50 /tmp/backend.log
   ```

---

*Backend is ready to use!*
