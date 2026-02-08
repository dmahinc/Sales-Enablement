#!/usr/bin/env bash
# Health check script for Sales Enablement Platform

set -e

VM_IP="91.134.72.199"
BACKEND_URL="http://${VM_IP}:8001"
FRONTEND_URL="http://${VM_IP}:3003"

echo "=== Sales Enablement Platform Health Check ==="
echo ""

# Check Docker containers
echo "1. Checking Docker containers..."
if docker ps | grep -q sales-enablement-backend && \
   docker ps | grep -q sales-enablement-frontend && \
   docker ps | grep -q sales-enablement-db; then
    echo "   ✓ All containers are running"
else
    echo "   ✗ Some containers are not running"
    docker ps | grep sales-enablement || echo "   No sales-enablement containers found"
    exit 1
fi

# Check backend health
echo ""
echo "2. Checking backend health..."
BACKEND_HEALTH=$(curl -s "${BACKEND_URL}/health" || echo "ERROR")
if echo "$BACKEND_HEALTH" | grep -q "healthy"; then
    echo "   ✓ Backend is healthy"
else
    echo "   ✗ Backend health check failed: $BACKEND_HEALTH"
    exit 1
fi

# Check frontend
echo ""
echo "3. Checking frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_URL}/" || echo "000")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "   ✓ Frontend is accessible"
else
    echo "   ✗ Frontend returned status: $FRONTEND_STATUS"
    exit 1
fi

# Check API connectivity from frontend perspective
echo ""
echo "4. Checking API endpoint..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/api/health" || echo "000")
if [ "$API_STATUS" = "200" ] || [ "$API_STATUS" = "404" ]; then
    echo "   ✓ API endpoint is accessible (status: $API_STATUS)"
else
    echo "   ⚠ API endpoint returned status: $API_STATUS"
fi

echo ""
echo "=== All checks passed! ==="
echo ""
echo "Access URLs:"
echo "  Frontend: ${FRONTEND_URL}"
echo "  Backend API: ${BACKEND_URL}"
echo "  Backend Health: ${BACKEND_URL}/health"
