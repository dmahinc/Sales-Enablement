#!/usr/bin/env bash
# Complete HTTPS configuration after certificates are obtained

set -e

DOMAIN="${1:-}"

if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 <domain-name>"
    echo "Example: $0 enablement.example.com"
    exit 1
fi

echo "Configuring HTTPS for domain: $DOMAIN"
echo ""

cd /home/ubuntu/Sales-Enablement

# Create nginx service in docker-compose
cat > docker-compose.ssl.yml <<EOF
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: sales-enablement-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - /var/www/certbot:/var/www/certbot:ro
    depends_on:
      - frontend
      - backend
    networks:
      - sales-enablement-network
    restart: unless-stopped
EOF

# Update .env file
if [ -f .env ]; then
    # Backup
    cp .env .env.backup
    
    # Update API URL and CORS
    sed -i "s|VITE_API_URL=.*|VITE_API_URL=https://$DOMAIN/api|g" .env
    sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=https://$DOMAIN,https://www.$DOMAIN|g" .env
    sed -i "s|PLATFORM_URL=.*|PLATFORM_URL=https://$DOMAIN|g" .env
    
    echo "Updated .env file"
fi

# Update frontend nginx config to handle API proxy
cat > frontend/nginx.conf <<EOF
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # Handle React Router
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

echo "✅ Configuration files created!"
echo ""
echo "To complete setup:"
echo "1. Rebuild frontend: docker-compose build frontend"
echo "2. Start with SSL: docker-compose -f docker-compose.yml -f docker-compose.ssl.yml up -d"
echo ""
echo "Access your application at: https://$DOMAIN"
