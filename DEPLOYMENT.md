# Homestead Deployment Guide

## Quick Start (LAN / Local)

If you just want to run Homestead on your local network (no domain, no SSL):

```bash
cp .env.example .env
# Edit .env — change JWT secrets (see step 6 below for how to generate them)

docker compose -f docker-compose.prod.yml up -d --build
# Open http://localhost or http://<your-lan-ip>
```

The rest of this guide covers deploying to a VPS with HTTPS.

---

## VPS Deployment — Full Walkthrough

### Step 1: Buy a Domain

You need a domain name (e.g., `chat.yourdomain.com`). This is required because:
- Let's Encrypt needs a domain to issue SSL certificates (it doesn't work with bare IP addresses)
- Browsers block microphone access (needed for voice) on non-HTTPS, non-localhost origins

**Where to buy:**
- [Porkbun](https://porkbun.com) — cheap, simple UI (~$9/year for .com)
- [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) — at-cost pricing, great DNS management
- [Namecheap](https://www.namecheap.com) — well-known, frequent sales

Any registrar works. You just need the ability to set DNS records (all of the above support this).

**Tip:** You can use a subdomain of a domain you already own (e.g., `homestead.yourdomain.com`). No need to buy a new one.

### Step 2: Provision a VPS

A VPS is a virtual server in the cloud that runs 24/7. Homestead is lightweight — the smallest tier from any provider is fine.

**Recommended providers:**
- [DigitalOcean](https://www.digitalocean.com) — $6/mo (1 vCPU, 1GB RAM, 25GB SSD)
- [Vultr](https://www.vultr.com) — $6/mo (same specs)
- [Hetzner](https://www.hetzner.com/cloud) — ~$4/mo (best value, EU/US datacenters)

**When creating the VPS:**
- **OS:** Ubuntu 24.04 LTS (or 22.04)
- **Plan:** 1 GB RAM, 1 vCPU is enough
- **Region:** pick one close to your users
- **Authentication:** choose **SSH key** (not password) — see step 3

After creation, the provider will show you the server's **IP address** (e.g., `143.198.xx.xx`). You'll need this.

### Step 3: Set Up SSH Key Authentication

SSH keys let you log into your server securely without a password. Most VPS providers let you add your key during server creation.

**Check if you already have an SSH key:**
```bash
ls ~/.ssh/id_ed25519.pub
# or
ls ~/.ssh/id_rsa.pub
```

**If not, generate one:**
```bash
ssh-keygen -t ed25519 -C "your@email.com"
# Press Enter to accept the default file location
# Enter a passphrase (recommended) or press Enter for none
```

**Copy your public key** (the `.pub` file) and add it to your VPS provider during server creation:
```bash
cat ~/.ssh/id_ed25519.pub
```

**Test the connection:**
```bash
ssh root@YOUR_SERVER_IP
```

You should get a shell prompt on your server without being asked for a password.

### Step 4: Secure the VPS

Once you're SSH'd into the server, run these commands to lock it down.

**4a. Update the system:**
```bash
apt update && apt upgrade -y
```

**4b. Create a non-root user:**

Running everything as root is risky. Create a regular user:
```bash
adduser homestead
# Set a strong password, press Enter through the other prompts

# Give them sudo access
usermod -aG sudo homestead

# Copy your SSH key to the new user so you can log in as them
mkdir -p /home/homestead/.ssh
cp ~/.ssh/authorized_keys /home/homestead/.ssh/
chown -R homestead:homestead /home/homestead/.ssh
chmod 700 /home/homestead/.ssh
chmod 600 /home/homestead/.ssh/authorized_keys
```

Test logging in as the new user (from your local machine):
```bash
ssh homestead@YOUR_SERVER_IP
```

**4c. Disable root login and password authentication:**
```bash
sudo nano /etc/ssh/sshd_config
```

Find and change these lines (some may need to be uncommented by removing the `#`):
```
PermitRootLogin no
PasswordAuthentication no
```

Save (`Ctrl+O`, `Enter`, `Ctrl+X`) and restart SSH:
```bash
sudo systemctl restart ssh
```

> **Important:** Before closing your current SSH session, open a **new terminal** and verify you can still log in as `homestead`. If you lock yourself out, you'll need to use your VPS provider's console.

**4d. Set up the firewall:**
```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# If you plan to use TURN (voice relay), also allow:
# sudo ufw allow 3478/tcp
# sudo ufw allow 3478/udp
# sudo ufw allow 49152:49200/udp

# Enable the firewall
sudo ufw enable

# Verify
sudo ufw status
```

**4e. Enable automatic security updates:**
```bash
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
# Select "Yes"
```

### Step 5: Install Docker

Still SSH'd into your server as the `homestead` user:

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Let your user run Docker without sudo
sudo usermod -aG docker $USER

# Log out and back in for the group change to take effect
exit
```

Log back in and verify:
```bash
ssh homestead@YOUR_SERVER_IP
docker compose version
# Should print something like "Docker Compose version v2.x.x"
```

### Step 6: Clone and Configure

```bash
git clone https://github.com/aidancorrell/homestead.git
cd homestead
cp .env.example .env
```

Generate secrets and edit `.env`:
```bash
# Generate two random secrets (run this twice, save each output)
openssl rand -hex 48

nano .env
```

Set these values in `.env`:
```
JWT_ACCESS_SECRET=<paste first random hex>
JWT_REFRESH_SECRET=<paste second random hex>
POSTGRES_PASSWORD=<run openssl rand -hex 24 and paste>
DOMAIN=chat.yourdomain.com
SSL_EMAIL=you@email.com
```

Leave everything else at defaults unless you know what you're changing.

### Step 7: Point DNS to Your VPS

Go to your domain registrar's DNS settings and add an **A record**:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `chat` (or `@` for root domain) | `YOUR_SERVER_IP` | 300 |

- If your domain is `yourdomain.com` and you want `chat.yourdomain.com`, set Name to `chat`
- If you want to use the root domain `yourdomain.com`, set Name to `@`

**Wait for propagation** (usually 1-5 minutes, can take up to an hour):
```bash
# Run this from your local machine or the server
dig +short chat.yourdomain.com
# Should return your server's IP address
```

Don't proceed until this returns the correct IP.

### Step 8: Get SSL Certificate and Start

```bash
chmod +x init-ssl.sh
./init-ssl.sh
```

This will:
1. Start nginx on HTTP to serve the Let's Encrypt verification challenge
2. Request a free SSL certificate from Let's Encrypt
3. Restart nginx with HTTPS enabled

If it succeeds, you'll see: `SSL certificate provisioned for chat.yourdomain.com`

Now start everything:
```bash
docker compose -f docker-compose.prod.yml up -d
```

Visit `https://chat.yourdomain.com` — you should see the login page.

### Step 8b: Create Your First Server and Invite Users

Homestead uses **invite-only registration**. New users need a server invite code to create an account. To bootstrap:

1. You (the first user) need to create an initial server. Run this on the VPS:
```bash
# Connect to the database
docker compose -f docker-compose.prod.yml exec postgres psql -U homestead homestead

# Create a user manually (replace values as needed)
INSERT INTO users (id, username, display_name, password_hash, status, token_version)
VALUES (gen_random_uuid(), 'admin', 'Admin', '$2b$10$placeholder', 'offline', 0);

# Create a server with an invite code
INSERT INTO servers (id, name, owner_id, invite_code)
VALUES (gen_random_uuid(), 'My Server', (SELECT id FROM users WHERE username='admin'), 'INVITE123');

# Add yourself as a member
INSERT INTO server_members (id, user_id, server_id, role)
VALUES (gen_random_uuid(), (SELECT id FROM users WHERE username='admin'), (SELECT id FROM servers WHERE invite_code='INVITE123'), 'owner');

\q
```

2. Better approach — register normally through the app. First, temporarily create a server with an invite code:
```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U homestead homestead -c \
  "INSERT INTO servers (id, name, owner_id, invite_code) VALUES (gen_random_uuid(), 'Homestead', gen_random_uuid(), 'BOOTSTRAP');"
```
Then register at `https://chat.yourdomain.com/register` with invite code `BOOTSTRAP`. After registering, update the server's owner_id to your user and delete the dummy owner:
```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U homestead homestead -c \
  "UPDATE servers SET owner_id = (SELECT id FROM users WHERE username='YOUR_USERNAME') WHERE invite_code='BOOTSTRAP'; DELETE FROM users WHERE id NOT IN (SELECT user_id FROM server_members);"
```

3. Share the server's invite code with friends — they'll enter it during registration and automatically join your server.

4. To get or regenerate an invite code, use the invite button in the app (server settings), or query the database:
```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U homestead homestead -c "SELECT name, invite_code FROM servers;"
```

### Step 9: Set Up Automatic Certificate Renewal

Let's Encrypt certificates expire every 90 days. Set up a weekly cron job to auto-renew:

```bash
crontab -e
# If asked which editor, choose nano (option 1)
```

Add this line at the bottom:
```
0 3 * * 1 cd /home/homestead/homestead && docker compose -f docker-compose.prod.yml run --rm certbot renew && docker compose -f docker-compose.prod.yml restart nginx >> /home/homestead/certbot-renewal.log 2>&1
```

Save and exit. This runs every Monday at 3am. Certbot will only renew if the cert is within 30 days of expiring.

### Step 10: Enable TURN (Voice Relay)

TURN is needed if your users are on different networks (which they will be on the internet). Without it, voice calls may fail for users behind restrictive NATs or firewalls.

**Open the TURN ports on the firewall:**
```bash
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 49152:49200/udp
```

**Add TURN config to `.env`:**
```bash
nano .env
```

Add/update these lines:
```
TURN_URL=turn:chat.yourdomain.com:3478
TURN_USER=homestead
TURN_PASSWORD=<run openssl rand -hex 24 and paste>
```

**Restart with TURN enabled:**
```bash
docker compose -f docker-compose.prod.yml --profile turn up -d
```

---

## Ongoing Maintenance

### Updating Homestead

```bash
cd ~/homestead
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Database migrations run automatically on server startup.

### Viewing Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs nginx -f
docker compose -f docker-compose.prod.yml logs server -f
docker compose -f docker-compose.prod.yml logs postgres -f
```

### Backing Up the Database

```bash
# Create a backup
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U homestead homestead > backup_$(date +%Y%m%d).sql

# Restore from backup
cat backup_20250101.sql | docker compose -f docker-compose.prod.yml exec -T postgres psql -U homestead homestead
```

### Restarting Services

```bash
# Restart everything
docker compose -f docker-compose.prod.yml restart

# Restart a single service
docker compose -f docker-compose.prod.yml restart server
```

---

## Configuration Reference

| Variable | Default | Description |
|---|---|---|
| `JWT_ACCESS_SECRET` | *required* | Secret for access token signing (min 32 chars) |
| `JWT_REFRESH_SECRET` | *required* | Secret for refresh token signing (min 32 chars) |
| `POSTGRES_USER` | `homestead` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `homestead` | PostgreSQL password — **change in production** |
| `POSTGRES_DB` | `homestead` | PostgreSQL database name |
| `HTTP_PORT` | `80` | Port to expose HTTP on |
| `HTTPS_PORT` | `443` | Port to expose HTTPS on |
| `DOMAIN` | `localhost` | Domain name (used for nginx config + SSL) |
| `SSL_EMAIL` | *(empty)* | Email for Let's Encrypt registration |
| `PROD_CORS_ORIGIN` | `https://${DOMAIN}` | Allowed origin for CORS |
| `TURN_URL` | *(empty)* | TURN server URL (e.g., `turn:your-domain:3478`) |
| `TURN_USER` | *(empty)* | TURN username |
| `TURN_PASSWORD` | *(empty)* | TURN password — **use a strong random value** |

---

## Troubleshooting

**Can't SSH into the server:**
- Verify your SSH key is correct: `ssh -v homestead@YOUR_IP`
- If locked out, use your VPS provider's web console to fix `/etc/ssh/sshd_config`

**App doesn't load:**
- Check nginx logs: `docker compose -f docker-compose.prod.yml logs nginx`
- Make sure DNS is pointing to the right IP: `dig +short yourdomain.com`
- Check firewall: `sudo ufw status` (ports 80 and 443 should be open)

**SSL certificate failed:**
- DNS must be pointing to your server before running `init-ssl.sh`
- Port 80 must be open (Let's Encrypt uses HTTP to verify)
- Check: `docker compose -f docker-compose.prod.yml run --rm certbot certificates`

**API errors:**
- Check server logs: `docker compose -f docker-compose.prod.yml logs server`
- Verify `.env` has valid JWT secrets (min 32 chars each)

**Database issues:**
- Check postgres logs: `docker compose -f docker-compose.prod.yml logs postgres`
- Verify `POSTGRES_PASSWORD` in `.env` hasn't changed after first run (changing it won't update the existing database password)

**Voice not connecting:**
- HTTPS is required for microphone access — make sure you're on `https://`
- If users are on different networks, TURN is required (see step 10)
- Check browser console (F12) for WebRTC errors
- Verify TURN ports are open: `sudo ufw status`

**Reset everything (destructive):**
```bash
docker compose -f docker-compose.prod.yml down -v  # WARNING: deletes all data including database
docker compose -f docker-compose.prod.yml up -d --build
```
