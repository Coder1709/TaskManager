#!/bin/bash

# Configuration
DOMAIN="taskmanagers.in"
EMAIL="admin@taskmanagers.in" # Generic admin email
COMPOSE_FILE="docker-compose.prod.yml"

echo "Starting SSL setup for $DOMAIN..."

# 1. Request Certificate using Certbot (Nginx plugin or webroot mode)
# Since Nginx is running and serving /.well-known/acme-challenge, we use webroot mode via the certbot container
echo "Requesting Let's Encrypt certificate..."
docker compose -f $COMPOSE_FILE run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    -d $DOMAIN \
    -d www.$DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email

if [ $? -ne 0 ]; then
    echo "Error: Certificate generation failed."
    exit 1
fi

echo "Certificate obtained successfully."

# 2. Update Nginx Configuration
echo "Configuring Nginx for HTTPS..."

# Backup original config
cp nginx/nginx.conf nginx/nginx.conf.bak

# Copy HTTPS config to active config
# We assume nginx.https.conf exists on the server (uploaded via deployment)
if [ -f "nginx/nginx.https.conf" ]; then
    cp nginx/nginx.https.conf nginx/nginx.conf
else
    echo "Error: nginx/nginx.https.conf not found. Please ensure it is deployed."
    exit 1
fi

# 3. Reload Nginx to apply changes
echo "Reloading Nginx..."
docker compose -f $COMPOSE_FILE exec nginx nginx -s reload

echo "SSL Setup Complete! https://$DOMAIN should now be accessible."
