#!/bin/bash
# Script to configure SMTP settings for the backend container

echo "SMTP Configuration Helper"
echo "========================"
echo ""
echo "Please provide your SMTP settings:"
echo ""

read -p "SMTP_ENABLED (true/false) [default: true]: " SMTP_ENABLED
SMTP_ENABLED=${SMTP_ENABLED:-true}

read -p "SMTP_HOST [default: smtp.ovh.net]: " SMTP_HOST
SMTP_HOST=${SMTP_HOST:-smtp.ovh.net}

read -p "SMTP_PORT [default: 587]: " SMTP_PORT
SMTP_PORT=${SMTP_PORT:-587}

read -p "SMTP_USER (your SMTP username): " SMTP_USER

read -sp "SMTP_PASSWORD (your SMTP password): " SMTP_PASSWORD
echo ""

read -p "SMTP_FROM_EMAIL [default: noreply@ovhcloud.com]: " SMTP_FROM_EMAIL
SMTP_FROM_EMAIL=${SMTP_FROM_EMAIL:-noreply@ovhcloud.com}

read -p "SMTP_FROM_NAME [default: Products & Solutions Enablement]: " SMTP_FROM_NAME
SMTP_FROM_NAME=${SMTP_FROM_NAME:-Products & Solutions Enablement}

read -p "SMTP_USE_TLS (true/false) [default: true]: " SMTP_USE_TLS
SMTP_USE_TLS=${SMTP_USE_TLS:-true}

echo ""
echo "Creating .env file with SMTP settings..."

cat > .env << EOF
# SMTP Configuration
SMTP_ENABLED=${SMTP_ENABLED}
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=${SMTP_PORT}
SMTP_USER=${SMTP_USER}
SMTP_PASSWORD=${SMTP_PASSWORD}
SMTP_FROM_EMAIL=${SMTP_FROM_EMAIL}
SMTP_FROM_NAME=${SMTP_FROM_NAME}
SMTP_USE_TLS=${SMTP_USE_TLS}
EOF

echo ".env file created successfully!"
echo ""
echo "To apply these settings, you need to:"
echo "1. Rebuild the Docker image: docker build -t sales-enablement-backend:latest -f Dockerfile ."
echo "2. Restart the container: docker restart sales-enablement-backend"
echo ""
echo "Or mount the .env file as a volume when starting the container."
