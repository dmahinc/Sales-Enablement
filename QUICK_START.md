# Quick Start Guide - Sales Enablement Platform

## 🚀 Everything is Running!

Your Sales Enablement Platform is **fully operational** and configured to stay up automatically.

## Access Your Application

- **🌐 Frontend:** http://91.134.72.199:3003
- **🔧 Backend API:** http://91.134.72.199:8001
- **📚 API Docs:** http://91.134.72.199:8001/docs
- **❤️ Health Check:** http://91.134.72.199:8001/health

## Quick Commands

### Check Status
```bash
cd /home/ubuntu/Sales-Enablement
./health-check.sh          # Full health check
docker compose ps          # Container status
```

### View Logs
```bash
docker compose logs -f              # All services
docker compose logs -f backend      # Backend only
docker compose logs -f frontend     # Frontend only
```

### Restart Services
```bash
docker compose restart              # Restart all
docker compose restart backend      # Restart backend only
sudo systemctl restart sales-enablement.service  # Via systemd
```

### Stop/Start
```bash
docker compose down                # Stop all
docker compose up -d               # Start all
```

## Auto-Start Configuration ✅

- ✅ **Docker** starts automatically on boot
- ✅ **Sales Enablement** services start automatically via systemd
- ✅ **Containers** auto-restart if they crash

## First Time Setup

If you need to create an admin user:

```bash
docker compose exec backend python create_admin.py
```

Follow the prompts to create your admin account.

## Troubleshooting

### Services Not Accessible?
1. Run health check: `./health-check.sh`
2. Check containers: `docker compose ps`
3. Check logs: `docker compose logs`

### Need to Rebuild?
```bash
docker compose down
docker compose build
docker compose up -d
```

### Check System Service
```bash
sudo systemctl status sales-enablement.service
```

## Files & Scripts

- `health-check.sh` - Run health checks
- `SETUP_COMPLETE.md` - Full setup documentation
- `.env` - Configuration file

---
**Status:** ✅ All systems operational
**Last Updated:** $(date)
