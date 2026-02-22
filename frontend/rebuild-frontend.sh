#!/bin/bash
# Rebuild frontend Docker image with SSL certificates
# This ensures HTTPS always works

set -e

echo "🔨 Rebuilding frontend with SSL certificates..."

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Ensure SSL directory exists in frontend
mkdir -p "$SCRIPT_DIR/ssl"

# Copy SSL certificates (requires sudo for permissions)
echo "📋 Copying SSL certificates..."
sudo cp "$PROJECT_ROOT/ssl/sales-enablement.crt" "$SCRIPT_DIR/ssl/" 2>/dev/null || {
    echo "⚠️  Warning: Could not copy sales-enablement.crt"
}
sudo cp "$PROJECT_ROOT/ssl/sales-enablement.key" "$SCRIPT_DIR/ssl/" 2>/dev/null || {
    echo "⚠️  Warning: Could not copy sales-enablement.key"
}
sudo cp "$PROJECT_ROOT/ssl/ca.crt" "$SCRIPT_DIR/ssl/" 2>/dev/null || {
    echo "⚠️  Warning: Could not copy ca.crt"
}

# Fix permissions for Docker build
sudo chmod 644 "$SCRIPT_DIR/ssl"/*.key 2>/dev/null || true
sudo chmod 644 "$SCRIPT_DIR/ssl"/*.crt 2>/dev/null || true

# Build Docker image
echo "🐳 Building Docker image..."
cd "$SCRIPT_DIR"
docker build -t sales-enablement-frontend:latest -f Dockerfile .

echo "✅ Frontend image rebuilt successfully!"
echo ""
echo "To restart the container:"
echo "  docker stop sales-enablement-frontend && docker rm sales-enablement-frontend"
echo "  docker run -d --name sales-enablement-frontend --network sales-enablement_sales-enablement-network -p 3080:80 -p 3443:443 sales-enablement-frontend:latest"
