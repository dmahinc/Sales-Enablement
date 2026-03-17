#!/usr/bin/env bash
# Setup Let's Encrypt SSL for Sales Enablement Platform
# Eliminates browser security warnings for customers viewing shared documents
#
# Prerequisites:
# - A domain name pointing to this server's IP (e.g. sales.yourcompany.com -> 91.134.72.199)
# - Ports 80 and 443 open and accessible from the internet
#
# Usage: ./setup-letsencrypt.sh <domain> [email]

set -e

DOMAIN="${1:-}"
EMAIL="${2:-admin@ovhcloud.com}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 <domain-name> [email]"
    echo ""
    echo "Example: $0 sales.yourcompany.com admin@yourcompany.com"
    echo ""
    echo "IMPORTANT: Let's Encrypt requires a domain name (not an IP address)."
    echo "1. Create a DNS A record: $DOMAIN -> your server IP (e.g. 91.134.72.199)"
    echo "2. Wait for DNS propagation (a few minutes)"
    echo "3. Run this script"
    exit 1
fi

echo "=========================================="
echo "Let's Encrypt SSL Setup for Sales Enablement"
echo "=========================================="
echo "Domain: $DOMAIN"
echo "Email:  $EMAIL"
echo ""

# Install certbot if not installed
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    sudo apt-get update
    sudo apt-get install -y certbot
fi

# Create directories
sudo mkdir -p /var/www/certbot
sudo mkdir -p /etc/letsencrypt

# Stop nginx to free port 80 for certbot standalone
echo "Stopping nginx to obtain certificate..."
cd "$SCRIPT_DIR"
docker stop sales-enablement-nginx 2>/dev/null || true
docker rm sales-enablement-nginx 2>/dev/null || true
if [ -f docker-compose.yml ]; then
    docker-compose -f docker-compose.yml -f docker-compose.https.yml stop nginx 2>/dev/null || true
fi

# Wait for port 80 to be free
sleep 2

# Obtain certificate
echo ""
echo "Obtaining SSL certificate from Let's Encrypt..."
sudo certbot certonly --standalone \
    --preferred-challenges http \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive

# Create nginx config for Let's Encrypt
echo ""
echo "Creating nginx configuration..."
cat > "$SCRIPT_DIR/nginx/nginx-letsencrypt.conf" <<NGINX_EOF
# HTTPS with Let's Encrypt - No browser security warnings
# Generated for domain: $DOMAIN

# HTTP - redirect to HTTPS + ACME challenge for renewal
server {
    listen 80;
    server_name $DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        try_files \$uri =404;
    }
    
    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    location /api/ {
        proxy_pass http://backend:8001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_read_timeout 3600s;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX_EOF

# Create docker-compose overlay for Let's Encrypt
cat > "$SCRIPT_DIR/docker-compose.letsencrypt.yml" <<COMPOSE_EOF
# Let's Encrypt overlay - Use instead of docker-compose.https.yml
# docker-compose -f docker-compose.yml -f docker-compose.letsencrypt.yml up -d

services:
  nginx:
    image: nginx:alpine
    container_name: sales-enablement-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx-letsencrypt.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - /var/www/certbot:/var/www/certbot:ro
    depends_on:
      - frontend
      - backend
    networks:
      - sales-enablement-network
    restart: unless-stopped

  frontend:
    environment:
      - VITE_API_URL=https://$DOMAIN/api

  backend:
    environment:
      CORS_ORIGINS: '["https://$DOMAIN","https://www.$DOMAIN","http://localhost:3003"]'
      PLATFORM_URL: https://$DOMAIN
COMPOSE_EOF

# Update backend .env if it exists
if [ -f "$SCRIPT_DIR/backend/.env" ]; then
    if grep -q "PLATFORM_URL=" "$SCRIPT_DIR/backend/.env"; then
        sed -i.bak "s|PLATFORM_URL=.*|PLATFORM_URL=https://$DOMAIN|g" "$SCRIPT_DIR/backend/.env"
        echo "Updated backend/.env PLATFORM_URL"
    fi
fi

# Start nginx with Let's Encrypt config
echo ""
echo "Starting nginx with Let's Encrypt certificate..."
if [ -f "$SCRIPT_DIR/docker-compose.yml" ]; then
    cd "$SCRIPT_DIR"
    docker-compose -f docker-compose.yml -f docker-compose.letsencrypt.yml up -d nginx 2>/dev/null || {
        echo "Note: Could not start via docker-compose. Try manually (see below)."
    }
else
    # Standalone docker run (when docker-compose.yml is not used)
    docker run -d --name sales-enablement-nginx \
        --network sales-enablement-network \
        -p 80:80 -p 443:443 \
        -v "$SCRIPT_DIR/nginx/nginx-letsencrypt.conf:/etc/nginx/conf.d/default.conf:ro" \
        -v /etc/letsencrypt:/etc/letsencrypt:ro \
        -v /var/www/certbot:/var/www/certbot:ro \
        --restart unless-stopped \
        nginx:alpine 2>/dev/null && echo "Nginx started." || {
        echo "Note: Could not start nginx (container may already exist). Run:"
        echo "  docker stop sales-enablement-nginx; docker rm sales-enablement-nginx"
        echo "  docker run -d --name sales-enablement-nginx --network sales-enablement-network -p 80:80 -p 443:443 \\"
        echo "    -v $SCRIPT_DIR/nginx/nginx-letsencrypt.conf:/etc/nginx/conf.d/default.conf:ro \\"
        echo "    -v /etc/letsencrypt:/etc/letsencrypt:ro -v /var/www/certbot:/var/www/certbot:ro \\"
        echo "    --restart unless-stopped nginx:alpine"
    }
fi

echo ""
echo "=========================================="
echo "✅ Let's Encrypt certificate obtained!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Rebuild frontend with new API URL (required for share links):"
echo "   cd $SCRIPT_DIR/frontend"
echo "   VITE_API_URL=https://$DOMAIN/api docker build -t sales-enablement-frontend:latest ."
echo "   docker stop sales-enablement-frontend && docker rm sales-enablement-frontend"
echo "   docker run -d --name sales-enablement-frontend --network sales-enablement-network \\"
echo "     -p 3080:80 -p 3443:443 sales-enablement-frontend:latest"
echo ""
echo "2. Update backend PLATFORM_URL and restart:"
echo "   Set PLATFORM_URL=https://$DOMAIN in backend/.env"
echo "   docker restart sales-enablement-backend"
echo ""
echo "3. Access at https://$DOMAIN (port 80/443) - no more browser warnings!"
echo ""
echo "4. Set up auto-renewal (certificates expire every 90 days):"
echo "   chmod +x $SCRIPT_DIR/renew-letsencrypt.sh"
echo "   sudo crontab -e"
echo "   Add: 0 0,12 * * * $SCRIPT_DIR/renew-letsencrypt.sh"
echo ""
