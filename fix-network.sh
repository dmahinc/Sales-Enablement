#!/bin/bash
# Fix: Connect backend to frontend network so /api proxy works (avoids 502 Bad Gateway on login)
# Run this if login fails for all users after container restart

echo "Connecting backend to frontend network..."
docker network connect sales-enablement-network sales-enablement-backend 2>/dev/null && echo "Backend connected." || echo "Backend may already be connected."
echo "Testing API..."
curl -s -k -o /dev/null -w "%{http_code}" -X POST https://91.134.72.199:3443/api/data/request \
  -H "Content-Type: application/json" -d '{"uid":"test@test.com"}' | grep -q 200 && \
  echo "✅ API OK - login should work" || echo "⚠️  API test failed - check containers"
