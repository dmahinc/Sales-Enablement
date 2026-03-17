#!/usr/bin/env bash
# Renew Let's Encrypt certificate and reload nginx
# Add to crontab: 0 0,12 * * * /home/ubuntu/Sales-Enablement/renew-letsencrypt.sh

# Certbot renews only if cert expires in < 30 days; deploy-hook runs only on renewal
sudo certbot renew --quiet --deploy-hook "docker restart sales-enablement-nginx" 2>/dev/null || true
