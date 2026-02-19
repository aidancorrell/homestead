# Homestead Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- Ports 80 (HTTP) and 443 (HTTPS) available on the host machine
- (Optional) Port 3478 + 49152-49200 for TURN server

## Quick Start (LAN / Local)

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env — at minimum, change JWT secrets:
#   JWT_ACCESS_SECRET=<random 48+ char hex>
#   JWT_REFRESH_SECRET=<random 48+ char hex>
# Generate secrets: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 2. Build and start
docker compose -f docker-compose.prod.yml up -d --build

# 3. Open in browser
# http://localhost (or http://<your-lan-ip>)
```

## VPS Deployment (HTTPS with Let's Encrypt)

### 1. Provision a VPS

Any provider works (DigitalOcean, Vultr, Hetzner, etc.). Minimum specs:
- Ubuntu 22.04+ (or any Linux with Docker)
- 1 GB RAM
- Ports 80, 443 open in firewall

### 2. Install Docker + Docker Compose

```bash
# Ubuntu
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in, then verify:
docker compose version
```

### 3. Clone and Configure

```bash
git clone <your-repo-url> homestead
cd homestead
cp .env.example .env
```

Edit `.env` with production values:
```
JWT_ACCESS_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
JWT_REFRESH_SECRET=<generate with the same command>
DOMAIN=homestead.example.com
SSL_EMAIL=you@example.com
POSTGRES_PASSWORD=<strong random password>
```

### 4. Point DNS to Your VPS

Create an **A record** pointing your domain to the VPS IP address. Wait for DNS propagation (usually a few minutes).

Verify: `dig +short homestead.example.com` should return your VPS IP.

### 5. Provision SSL Certificate

```bash
chmod +x init-ssl.sh
./init-ssl.sh
```

This script:
1. Starts nginx, postgres, and server on HTTP
2. Runs certbot to obtain a Let's Encrypt certificate via HTTP-01 challenge
3. Restarts nginx to switch to HTTPS config

### 6. Start the Full Stack

```bash
docker compose -f docker-compose.prod.yml up -d
```

Your app is now live at `https://homestead.example.com`.

### Certificate Renewal

Let's Encrypt certificates expire every 90 days. Renew with:

```bash
docker compose -f docker-compose.prod.yml run --rm certbot renew
docker compose -f docker-compose.prod.yml restart nginx
```

Set up a cron job for automatic renewal:
```bash
# Add to crontab (crontab -e):
0 3 * * 1 cd /path/to/homestead && docker compose -f docker-compose.prod.yml run --rm certbot renew && docker compose -f docker-compose.prod.yml restart nginx
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `JWT_ACCESS_SECRET` | *required* | Secret for access token signing (min 32 chars) |
| `JWT_REFRESH_SECRET` | *required* | Secret for refresh token signing (min 32 chars) |
| `POSTGRES_USER` | `homestead` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `homestead` | PostgreSQL password |
| `POSTGRES_DB` | `homestead` | PostgreSQL database name |
| `HTTP_PORT` | `80` | Port to expose HTTP on |
| `HTTPS_PORT` | `443` | Port to expose HTTPS on |
| `DOMAIN` | `localhost` | Domain name (used for nginx config + SSL) |
| `SSL_EMAIL` | *(empty)* | Email for Let's Encrypt registration |
| `PROD_CORS_ORIGIN` | `https://${DOMAIN}` | Allowed origin for CORS |
| `TURN_URL` | *(empty)* | TURN server URL (e.g., `turn:your-ip:3478`) |
| `TURN_USER` | *(empty)* | TURN username |
| `TURN_PASSWORD` | *(empty)* | TURN password |

## Network Setup

### LAN Access (Same Network)

No extra setup needed. Other devices on the same network can access the app at `http://<host-ip>`. WebRTC connects directly via local IPs.

### Remote Access (Over the Internet)

For users connecting from outside your network, you need HTTPS (required by browsers for microphone access). Follow the VPS deployment steps above, or:

1. **Port forward** ports 80 + 443 on your router to the host machine
2. **Set DOMAIN** in `.env` to your public hostname
3. **Run** `./init-ssl.sh` for SSL certificate
4. **Set up TURN** for WebRTC NAT traversal (see below)

## TURN Server Setup

TURN is only needed when users can't connect directly (different networks, restrictive NAT). For LAN-only use, skip this.

```bash
# 1. Add TURN vars to .env
TURN_URL=turn:your-server-ip:3478
TURN_USER=homestead
TURN_PASSWORD=your-turn-password

# 2. Start with TURN profile
docker compose -f docker-compose.prod.yml --profile turn up -d --build
```

TURN credentials are passed via environment variables — no need to edit config files. The `coturn/turnserver.conf` contains only static settings.

## Updating

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Database migrations run automatically on server startup.

## Troubleshooting

**App doesn't load**: Check `docker compose -f docker-compose.prod.yml logs nginx`

**API errors**: Check `docker compose -f docker-compose.prod.yml logs server`

**Database issues**: Check `docker compose -f docker-compose.prod.yml logs postgres`

**SSL certificate issues**:
- Ensure DNS A record points to your server IP
- Check certbot logs: `docker compose -f docker-compose.prod.yml run --rm certbot certificates`
- Ensure ports 80 and 443 are open in your firewall

**Voice not connecting**:
- On LAN: Ensure both devices can reach each other's IPs directly
- Over internet: Set up TURN server (see above)
- Check browser console for WebRTC errors
- HTTPS is required for microphone access on non-localhost origins

**Reset everything**:
```bash
docker compose -f docker-compose.prod.yml down -v  # WARNING: deletes all data
docker compose -f docker-compose.prod.yml up -d --build
```
