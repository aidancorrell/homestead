#!/bin/bash
set -e

# Load .env
if [ -f .env ]; then
    set -a
    . ./.env
    set +a
fi

if [ -z "$DOMAIN" ] || [ -z "$SSL_EMAIL" ]; then
    echo "Error: Set DOMAIN and SSL_EMAIL in .env first"
    exit 1
fi

# Start just nginx + postgres + server (no SSL yet, HTTP only for challenge)
docker compose -f docker-compose.prod.yml up -d postgres server nginx

echo "Waiting for nginx to start..."
sleep 3

# Request certificate
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot --webroot-path=/var/www/certbot \
    --email "$SSL_EMAIL" --agree-tos --no-eff-email \
    -d "$DOMAIN"

# Restart nginx to pick up SSL config
docker compose -f docker-compose.prod.yml restart nginx

echo "SSL certificate provisioned for $DOMAIN"
echo "Run: docker compose -f docker-compose.prod.yml up -d"
