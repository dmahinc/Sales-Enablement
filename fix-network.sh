#!/bin/bash
# Fix: Connect backend to the same Docker network as the frontend nginx so
# `sales-enablement-backend` resolves and /api proxy works (avoids 502 on login).
# Run after `docker run` / recreate if the backend is only on `sales-enablement-network`
# and not on the compose network `sales-enablement_sales-enablement-network`.

set -e
echo "Connecting backend to frontend (compose) network..."
docker network connect sales-enablement_sales-enablement-network sales-enablement-backend 2>/dev/null && echo "Backend connected to sales-enablement_sales-enablement-network." || echo "Already connected or network missing."

echo "Testing API from frontend container..."
docker exec sales-enablement-frontend wget -qO- --timeout=5 http://sales-enablement-backend:8001/health >/dev/null && echo "✅ Backend reachable from frontend — login should work." || echo "⚠️  Still failing — check docker ps and networks."
