# Let's Encrypt SSL Setup

This guide configures trusted SSL certificates from Let's Encrypt to **eliminate browser security warnings** when customers open shared document links (e.g. welcome emails, share links).

## Why Let's Encrypt?

- **Self-signed certificates** (current setup) → Browsers show "Your connection is not private" / "Advanced" / "Proceed anyway"
- **Let's Encrypt certificates** → Trusted by all major browsers, **no warnings** – customers can click links directly

## Prerequisites

1. **Domain name** – Let's Encrypt **cannot** issue certificates for IP addresses
   - Example: `sales.yourcompany.com` or `enablement.ovhcloud.com`
   - Create a DNS **A record** pointing to your server IP (e.g. `91.134.72.199`)

2. **Ports 80 and 443** – Must be open and accessible from the internet

3. **DNS propagation** – Wait a few minutes after creating the DNS record (`dig yourdomain.com` to verify)

## Quick Setup

```bash
cd /home/ubuntu/Sales-Enablement
chmod +x setup-letsencrypt.sh
./setup-letsencrypt.sh sales.yourcompany.com admin@yourcompany.com
```

The script will:
- Install certbot (if needed)
- Stop nginx temporarily
- Obtain the certificate from Let's Encrypt
- Create nginx config and start nginx with the new cert

## What the Script Does

1. Installs certbot (if needed)
2. Stops nginx temporarily to free port 80
3. Obtains certificate from Let's Encrypt
4. Creates `nginx/nginx-letsencrypt.conf` with your domain
5. Creates `docker-compose.letsencrypt.yml` overlay
6. Updates `PLATFORM_URL` for share links in emails

## Auto-Renewal

Certificates expire every 90 days. Set up automatic renewal:

```bash
chmod +x renew-letsencrypt.sh
sudo crontab -e
# Add this line (runs twice daily):
0 0,12 * * * /home/ubuntu/Sales-Enablement/renew-letsencrypt.sh
```

## Troubleshooting

### "Could not find a valid cert" / "Connection refused"
- Ensure DNS points to your server: `dig sales.yourcompany.com`
- Check port 80 is open: `sudo netstat -tlnp | grep :80`
- Temporarily stop nginx before running the script

### "nginx: [emerg] open() ... failed"
- Certificate path wrong – verify domain in nginx-letsencrypt.conf matches certbot output
- Check: `sudo ls /etc/letsencrypt/live/YOUR_DOMAIN/`

### Share links still show old URL
- Update `PLATFORM_URL` in backend/.env to `https://your-domain.com`
- Restart backend: `docker restart sales-enablement-backend`

## Switching Back to Self-Signed

If you need to revert:

```bash
docker-compose -f docker-compose.yml -f docker-compose.https.yml up -d
```

## Benefits

✅ **No browser warnings** – Customers trust the connection  
✅ **Free** – Let's Encrypt is free and automated  
✅ **Share links work** – Emails with document links open without "Proceed anyway"  
✅ **Professional** – Padlock icon in browser address bar  
