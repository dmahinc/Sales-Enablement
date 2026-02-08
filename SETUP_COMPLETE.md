# Sales Enablement Platform - Production Setup Complete ✅

## Status: All Systems Operational

The Sales Enablement Platform is now fully configured and running on your VM with automatic startup on boot.

## Access URLs

- **Frontend (User Interface):** http://91.134.72.199:3003
- **Backend API:** http://91.134.72.199:8001
- **Backend Health Check:** http://91.134.72.199:8001/health
- **API Documentation:** http://91.134.72.199:8001/docs (Swagger UI)

## What's Running

### Docker Containers
All services are running in Docker containers with automatic restart:

1. **Backend** (`sales-enablement-backend`)
   - Port: 8001
   - Status: Running with auto-restart
   - Health: ✅ Healthy

2. **Frontend** (`sales-enablement-frontend`)
   - Port: 3003
   - Status: Running with auto-restart
   - Serves React application via Nginx

3. **Database** (`sales-enablement-db`)
   - PostgreSQL 15
   - Status: Running and healthy
   - Internal Docker network only

## Persistence & Auto-Start

### Systemd Service
A systemd service has been created to ensure all services start automatically on boot:

- **Service Name:** `sales-enablement.service`
- **Status:** Enabled (will start on boot)
- **Location:** `/etc/systemd/system/sales-enablement.service`

### Docker Restart Policy
All containers use `restart: unless-stopped`, ensuring they:
- Automatically restart if they crash
- Stay running after VM reboots (via systemd)
- Only stop when explicitly stopped

## Management Commands

### Check Status
```bash
# Check all containers
docker-compose ps

# Check systemd service
sudo systemctl status sales-enablement.service

# Run health check
./health-check.sh
```

### Start/Stop Services
```bash
# Start all services
cd /home/ubuntu/Sales-Enablement
docker-compose up -d

# Stop all services
docker-compose down

# Restart all services
docker-compose restart

# View logs
docker-compose logs -f [service-name]
```

### Systemd Commands
```bash
# Start services via systemd
sudo systemctl start sales-enablement.service

# Stop services via systemd
sudo systemctl stop sales-enablement.service

# Restart services
sudo systemctl restart sales-enablement.service

# Check status
sudo systemctl status sales-enablement.service
```

## Health Monitoring

A health check script is available at:
```bash
./health-check.sh
```

This script verifies:
- ✅ All Docker containers are running
- ✅ Backend health endpoint responds
- ✅ Frontend is accessible
- ✅ API endpoints are reachable

## Configuration

### Environment Variables
Configuration is managed via `.env` file in the project root:
- Database credentials
- API keys and secrets
- CORS origins
- Email settings (if enabled)

### Frontend API Configuration
The frontend is configured to connect to:
- API URL: `http://91.134.72.199:8001/api`
- Set via `VITE_API_URL` environment variable during build

### CORS Configuration
Backend allows requests from:
- `http://91.134.72.199:3003` (Frontend)
- `http://91.134.72.199:80` (Alternative frontend port)
- `http://localhost:3003` (Local development)

## Troubleshooting

### Services Not Starting
1. Check Docker is running: `sudo systemctl status docker`
2. Check systemd service: `sudo systemctl status sales-enablement.service`
3. Check logs: `docker-compose logs`

### Port Conflicts
If ports 8001 or 3003 are already in use:
1. Edit `.env` file to change `BACKEND_PORT` or `FRONTEND_PORT`
2. Restart services: `docker-compose restart`

### Database Issues
1. Check database container: `docker ps | grep sales-enablement-db`
2. Check database logs: `docker-compose logs db`
3. Verify connection: `docker-compose exec db pg_isready`

### Frontend Can't Connect to Backend
1. Verify backend is running: `curl http://91.134.72.199:8001/health`
2. Check CORS configuration in `.env`
3. Verify `VITE_API_URL` matches backend URL

## Files Created

- `/etc/systemd/system/sales-enablement.service` - Systemd service file
- `./health-check.sh` - Health monitoring script
- `./sales-enablement.service` - Service file template (in project)

## Next Steps

1. **Create Admin User** (if not already done):
   ```bash
   docker-compose exec backend python create_admin.py
   ```

2. **Access the Application**:
   - Open http://91.134.72.199:3003 in your browser
   - Log in with admin credentials

3. **Monitor Logs**:
   ```bash
   docker-compose logs -f
   ```

## Support

For issues or questions:
- Check logs: `docker-compose logs`
- Run health check: `./health-check.sh`
- Review documentation in `/docs` folder

---
**Setup completed:** $(date)
**VM IP:** 91.134.72.199
**Status:** ✅ All systems operational and persistent
