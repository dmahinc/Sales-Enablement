#!/usr/bin/env bash
# Setup HTTPS with Let's Encrypt for Sales Enablement Platform

set -e

DOMAIN="${1:-}"
EMAIL="${2:-admin@ovhcloud.com}"

if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 <domain-name> [email]"
    echo ""
    echo "Example: $0 enablement.example.com admin@example.com"
    echo ""
    echo "Note: The domain must point to this server's IP (91.134.72.199)"
    exit 1
fi

echo "Setting up HTTPS for domain: $DOMAIN"
echo "Email: $EMAIL"
echo ""

# Install certbot if not installed
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    sudo apt-get update
    sudo apt-get install -y certbot python3-certbot-nginx
fi

# Create directory for certbot challenges
sudo mkdir -p /var/www/certbot

# Stop nginx if running (we'll use standalone mode first)
echo "Stopping services temporarily for certificate generation..."
cd /home/ubuntu/Sales-Enablement
docker-compose stop frontend || true

# Get certificate using standalone mode
echo "Obtaining SSL certificate from Let's Encrypt..."
sudo certbot certonly --standalone \
    --preferred-challenges http \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive \
    --keep-until-expiring

# Create nginx configuration with SSL
echo "Creating nginx SSL configuration..."
cat > /home/ubuntu/Sales-Enablement/nginx/nginx-ssl.conf <<EOF
# HTTPS configuration for Sales Enablement Platform

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name $DOMAIN;
    
    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Frontend
    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://backend:8001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

echo ""
echo "✅ SSL certificate obtained!"
echo ""
echo "Next steps:"
echo "1. Update docker-compose.yml to add nginx reverse proxy service"
echo "2. Update frontend API URL to use https://$DOMAIN/api"
echo "3. Update CORS settings to include https://$DOMAIN"
echo "4. Restart services"
echo ""
echo "Run: ./configure-https-complete.sh $DOMAIN"
