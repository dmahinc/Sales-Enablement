FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci || npm install

# Copy source code
COPY . .

# Build arguments for API URL - use relative URL to proxy through nginx
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

# Copy SSL certificates (from frontend/ssl directory)
COPY ssl/sales-enablement.crt /etc/nginx/ssl/sales-enablement.crt
COPY ssl/sales-enablement.key /etc/nginx/ssl/sales-enablement.key
COPY ssl/ca.crt /etc/nginx/ssl/ca.crt

# Set proper permissions for SSL key
RUN chmod 600 /etc/nginx/ssl/sales-enablement.key && \
    chmod 644 /etc/nginx/ssl/sales-enablement.crt && \
    chmod 644 /etc/nginx/ssl/ca.crt

# Copy HTTPS nginx configuration
COPY nginx-https.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
