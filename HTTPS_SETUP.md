# HTTPS Setup Guide

## Overview
Setting up HTTPS will encrypt all traffic, preventing Bitdefender from inspecting the password in login requests.

## Prerequisites
- A domain name pointing to your VM IP (91.134.72.199)
- Ports 80 and 443 open in firewall
- Root/sudo access

## Quick Setup (If you have a domain)

### Step 1: Run the setup script
```bash
cd /home/ubuntu/Sales-Enablement
./setup-https.sh your-domain.com your-email@example.com
```

This will:
- Install certbot
- Obtain SSL certificate from Let's Encrypt
- Create nginx SSL configuration

### Step 2: Complete the configuration
```bash
./configure-https-complete.sh your-domain.com
```

### Step 3: Rebuild and restart
```bash
docker-compose build frontend
docker-compose -f docker-compose.yml -f docker-compose.ssl.yml up -d
```

## Manual Setup (If you don't have a domain)

### Option 1: Self-Signed Certificate (for testing)

```bash
# Generate self-signed certificate
sudo mkdir -p /etc/ssl/private /etc/ssl/certs
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/nginx-selfsigned.key \
  -out /etc/ssl/certs/nginx-selfsigned.crt \
  -subj "/CN=91.134.72.199"

# Update nginx config to use self-signed cert
# Then restart services
```

**Note:** Browsers will show a security warning with self-signed certificates. Users will need to accept the warning.

### Option 2: Use a Free Domain

1. Get a free domain from:
   - Freenom (free domains)
   - DuckDNS (free subdomain)
   - No-IP (free dynamic DNS)

2. Point it to 91.134.72.199

3. Run the setup script above

## Architecture

With HTTPS setup:
```
Internet → Nginx (443/HTTPS) → Frontend Container (HTTP)
                              → Backend Container (HTTP)
```

- External: HTTPS encrypted
- Internal Docker network: HTTP (secure, not exposed)

## Certificate Renewal

Let's Encrypt certificates expire every 90 days. Set up auto-renewal:

```bash
# Test renewal
sudo certbot renew --dry-run

# Add to crontab (runs twice daily, renews if <30 days to expiry)
sudo crontab -e
# Add:
0 0,12 * * * certbot renew --quiet --deploy-hook "cd /home/ubuntu/Sales-Enablement && docker-compose restart nginx"
```

## Troubleshooting

### Certificate not obtained
- Ensure domain DNS points to 91.134.72.199
- Check ports 80/443 are open
- Verify no firewall blocking Let's Encrypt

### Nginx won't start
- Check certificate paths are correct
- Verify nginx config syntax: `nginx -t`
- Check logs: `docker-compose logs nginx`

### Frontend can't connect to backend
- Verify API URL in .env uses HTTPS
- Check CORS settings include HTTPS domain
- Ensure backend is accessible internally

## Benefits

✅ **Encrypted traffic** - Bitdefender can't inspect passwords  
✅ **Secure by default** - Industry standard  
✅ **Browser trust** - No security warnings  
✅ **SEO friendly** - HTTPS preferred by search engines  

---
**Status:** Ready to configure
**Next:** Run `./setup-https.sh <domain>` if you have a domain
