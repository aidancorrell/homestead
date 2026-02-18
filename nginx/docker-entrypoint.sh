#!/bin/sh
# Substitute DOMAIN env var into nginx config
if [ -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ]; then
    envsubst '${DOMAIN}' < /etc/nginx/templates/nginx-ssl.conf > /etc/nginx/conf.d/default.conf
else
    envsubst '${DOMAIN}' < /etc/nginx/templates/nginx.conf > /etc/nginx/conf.d/default.conf
fi
exec nginx -g 'daemon off;'
