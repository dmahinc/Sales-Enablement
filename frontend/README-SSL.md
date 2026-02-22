# Frontend SSL Configuration

This frontend Docker image includes SSL certificates for HTTPS support.

## SSL Certificates

SSL certificates are automatically included in the Docker image during build:
- `sales-enablement.crt` - Server certificate
- `sales-enablement.key` - Server private key  
- `ca.crt` - CA certificate (for browser installation)

Certificates are copied from `../ssl/` directory during build and stored in `/etc/nginx/ssl/` inside the container.

## Rebuilding the Frontend

### Quick Rebuild

Use the provided script:
```bash
cd frontend
./rebuild-frontend.sh
```

### Manual Rebuild

1. Copy SSL certificates to frontend/ssl:
```bash
sudo mkdir -p frontend/ssl
sudo cp ssl/sales-enablement.crt ssl/sales-enablement.key ssl/ca.crt frontend/ssl/
sudo chmod 644 frontend/ssl/*
```

2. Build the Docker image:
```bash
cd frontend
docker build -t sales-enablement-frontend:latest -f Dockerfile .
```

3. Restart the container:
```bash
docker stop sales-enablement-frontend && docker rm sales-enablement-frontend
docker run -d --name sales-enablement-frontend \
  --network sales-enablement_sales-enablement-network \
  -p 3080:80 \
  -p 3443:443 \
  sales-enablement-frontend:latest
```

## Access URLs

- **HTTPS:** https://91.134.72.199:3443
- **HTTP (redirects to HTTPS):** http://91.134.72.199:3080
- **CA Certificate:** https://91.134.72.199:3443/ssl/ca.crt

## Notes

- SSL certificates are self-signed - browsers will show a warning
- Users can install the CA certificate from `/ssl/ca.crt` to avoid warnings
- The nginx config (`nginx-https.conf`) handles HTTPS on port 443 and redirects HTTP (port 80) to HTTPS
- SSL certificates are embedded in the Docker image, so no volume mounts are needed
