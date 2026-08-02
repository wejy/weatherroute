# Solviax — production deployment

Guide for running the **web app + API** (`apps/web`) on a Linux VPS (e.g. UpCloud, Hetzner, DigitalOcean). The Expo app (`apps/mobile`) is built separately and talks to this API via `EXPO_PUBLIC_API_URL` — see **[EXPO_DEPLOYMENT.md](./EXPO_DEPLOYMENT.md)** for store builds, EAS, and mobile env/token rules.

There is **no** first-class Docker production image yet — deploy as a Node.js process managed by **PM2**, behind a reverse proxy. Local Postgres is only for development (`docker compose`).

---

## Architecture (recommended)

```text
Internet
   │
   ▼
┌──────────────────┐
│  nginx or Caddy  │  TLS termination, HTTP→HTTPS, proxy to :3000
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  PM2 → Next.js   │  `next start` — UI + /api/* + Auth.js + cron
└────────┬─────────┘
         │
         ├──────────► PostgreSQL (managed or self-hosted)
         ├──────────► Upstash Redis REST (rate limits)
         ├──────────► Resend (OTP email)
         ├──────────► Mapbox (maps / geocoding / directions)
         └──────────► Open-Meteo (weather, no API key)
```

**Single Node process** is enough for MVP (`instances: 1` in PM2). Cron jobs (`CRON_ENABLED`) run inside the Next.js process via `instrumentation.ts` — do not run multiple app replicas unless you accept duplicate cron or move jobs out.

---

## Server software

### Minimum (Ubuntu 24.04 LTS example)

| Software | Why |
|---|---|
| **Node.js 20+** (22 LTS recommended) | Next.js runtime |
| **npm** | Comes with Node |
| **git** | Deploy from repo |
| **PM2** | Process manager, auto-restart, boot start, logs |
| **PostgreSQL 16** | App DB — *or* use a managed DB and skip local install |
| **nginx** *or* **Caddy** | Reverse proxy + TLS |
| **certbot** | Only if using nginx (Let’s Encrypt). Caddy handles TLS itself |
| **ufw** (or equivalent) | Firewall: 22, 80, 443 |
| **build tools** | `build-essential` / `python3` — needed for native deps (e.g. `sharp`) |

Optional:

| Software | Why |
|---|---|
| **fail2ban** | SSH brute-force hardening |

### Install sketch (Ubuntu)

```bash
# Node 22 via NodeSource (or use nvm / fnm)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git build-essential python3

# PM2 (global)
sudo npm install -g pm2

# Reverse proxy — pick ONE
sudo apt-get install -y nginx certbot python3-certbot-nginx
# OR
sudo apt-get install -y caddy

# Firewall
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Managed Postgres (UpCloud / Neon / RDS / etc.) is preferred over installing Postgres on the same box.

---

## Environment variables

Put secrets in `apps/web/.env.production` on the server. Next.js loads that file automatically when `NODE_ENV=production`. **Never** commit secrets.

Restrict permissions after editing:

```bash
chmod 600 /var/www/solviax/apps/web/.env.production
```

### Required in production

| Variable | Example / notes |
|---|---|
| `NODE_ENV` | `production` (set by `next start` / PM2) |
| `DATABASE_URL` | `postgresql://USER:PASS@HOST:5432/solviax?sslmode=require` |
| `AUTH_SECRET` | Random ≥ **32** chars (`openssl rand -base64 48`) |
| `AUTH_URL` | `https://weather.example.com` (canonical public URL) |
| `NEXT_PUBLIC_APP_URL` | Same as `AUTH_URL` |
| `EMAIL_MODE` | `resend` (`console` is **rejected** at boot) |
| `RESEND_API_KEY` | From [resend.com](https://resend.com) |
| `USE_MOCKS` | `false` (`true` is **rejected** at boot) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Public token starting with `pk.` (browser map) |
| `MAPBOX_ACCESS_TOKEN` | Server token (`pk.` or `sk.`) for geocoding / directions |

### Strongly recommended

| Variable | Notes |
|---|---|
| `AUTH_TRUST_HOST` | `true` **only** behind nginx/Caddy/Cloudflare that you control |
| `CORS_ALLOWED_ORIGINS` | `https://weather.example.com` (+ Expo LAN origins only if needed) |
| `UPSTASH_REDIS_REST_URL` | Multi-instance / durable rate limits |
| `UPSTASH_REDIS_REST_TOKEN` | Pair with URL above |
| `EMAIL_FROM` | Verified Resend sender, e.g. `Solviax <noreply@example.com>` |
| `CRON_ENABLED` | `true` in production (nightly weather cache warm) |

### Optional / defaults

| Variable | Default | Notes |
|---|---|---|
| `ANON_DISCOVER_LIMIT` | `3` | Soft paywall credits per anon cookie |
| `ANON_SHARE_BONUS_CAP` | `2` | Share redeem bonus cap |
| `ANON_IP_DISCOVER_LIMIT` | `10` | Cookie-less / device IP daily limit |
| `USE_MOCK_WEATHER` | `false` | Keep `false` in prod |
| `PORT` | `3000` | Must match reverse proxy upstream |
| `LOG_LEVEL` | `info` (prod) / `debug` (dev) | Pino via `@solviax/logger` — JSON stdout in production |
| `LOG_PRETTY` | pretty on in dev | Set `0` to force JSON locally |

### Example production env file

```bash
NODE_ENV=production
PORT=3000

NEXT_PUBLIC_APP_URL=https://weather.example.com
AUTH_URL=https://weather.example.com
AUTH_SECRET=REPLACE_WITH_openssl_rand_base64_48
AUTH_TRUST_HOST=true

USE_MOCKS=false
USE_MOCK_WEATHER=false

DATABASE_URL=postgresql://solviax:SECRET@db.example.com:5432/solviax?sslmode=require

EMAIL_MODE=resend
RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM=Solviax <noreply@example.com>

CORS_ALLOWED_ORIGINS=https://weather.example.com

UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxx

NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxxx
MAPBOX_ACCESS_TOKEN=pk.xxxx

CRON_ENABLED=true
ANON_DISCOVER_LIMIT=3
ANON_IP_DISCOVER_LIMIT=10
```

Generate secrets:

```bash
openssl rand -base64 48   # AUTH_SECRET
```

---

## Deploy steps

### 1. Clone and install

```bash
sudo mkdir -p /var/www
sudo chown "$USER":"$USER" /var/www
cd /var/www
git clone <YOUR_REPO_URL> solviax
cd solviax
npm install
```

### 2. Configure env

```bash
cp apps/web/.env.example apps/web/.env.production
# edit apps/web/.env.production with production values
chmod 600 apps/web/.env.production
```

### 3. Database migrate (+ optional seed)

```bash
# From repo root — load DATABASE_URL for migrate/seed scripts
set -a
source apps/web/.env.production
set +a

npm run db:migrate -w @solviax/web

# Optional: seed places (demo / denser Geonames)
npm run db:seed -w @solviax/web
# npm run db:seed:geonames -w @solviax/web
```

### 4. Build

```bash
cd /var/www/solviax
npm run build -w @solviax/web
```

### 5. Process manager (PM2)

Create `/var/www/solviax/ecosystem.config.cjs` (or keep it in the repo if you prefer):

```js
module.exports = {
  apps: [
    {
      name: "solviax",
      cwd: "/var/www/solviax",
      script: "npm",
      args: "run start -w @solviax/web",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
```

`instances` must stay **1** while cron runs inside the Next.js process.

Start and enable boot persistence:

```bash
cd /var/www/solviax
pm2 start ecosystem.config.cjs
pm2 status
pm2 save
pm2 startup
# run the command PM2 prints (sudo env PATH=... pm2 startup systemd -u <user> --hp <home>)
```

Useful day-to-day commands:

```bash
pm2 status
pm2 logs solviax          # follow app + Pino stdout
pm2 logs solviax --lines 200
pm2 restart solviax
pm2 reload solviax        # graceful restart when possible
pm2 stop solviax
pm2 delete solviax
```

Smoke-test on the VPS:

```bash
curl -sI http://127.0.0.1:3000 | head
```

---

## Reverse proxy

Point DNS `A`/`AAAA` for `weather.example.com` at the VPS before issuing certificates.

### Option A — nginx + Let’s Encrypt

`/etc/nginx/sites-available/solviax`:

```nginx
server {
    listen 80;
    server_name weather.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name weather.example.com;

    # certbot will fill these, or use:
    # ssl_certificate     /etc/letsencrypt/live/weather.example.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/weather.example.com/privkey.pem;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/solviax /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d weather.example.com
```

With nginx in front, set `AUTH_TRUST_HOST=true`.

### Option B — Caddy (automatic HTTPS)

`/etc/caddy/Caddyfile`:

```caddy
weather.example.com {
    encode gzip
    reverse_proxy 127.0.0.1:3000
}
```

```bash
sudo systemctl reload caddy
```

Also set `AUTH_TRUST_HOST=true`.

---

## External services checklist

1. **Postgres** — create DB + user; run migrations; prefer TLS (`sslmode=require`).
2. **Resend** — verify domain / sender; set `EMAIL_MODE=resend` + API key.
3. **Mapbox** — create tokens; restrict `pk.` by URL; never expose `sk.` to the client (`NEXT_PUBLIC_*` must stay `pk.`).
4. **Upstash Redis** — create REST database; paste URL + token (rate limits across restarts / multiple hosts).
5. **DNS** — point domain at VPS; wait for propagation before TLS.

---

## Mobile (Expo)

Mobile does **not** run on the VPS. Point builds at the production API:

```bash
# apps/mobile/.env (EAS / local release builds)
EXPO_PUBLIC_API_URL=https://weather.example.com
```

Rebuild the Expo app after changing this. CORS must allow the origins your mobile WebView / Expo web uses if applicable; native `fetch` does not use browser CORS, but the API still rate-limits by IP / device header.

Full mobile release process (EAS, stores, token rules): **[EXPO_DEPLOYMENT.md](./EXPO_DEPLOYMENT.md)**.

---

## Updates (redeploy)

```bash
cd /var/www/solviax
git pull
npm install
set -a && source apps/web/.env.production && set +a
npm run db:migrate -w @solviax/web
npm run build -w @solviax/web
pm2 restart solviax
pm2 status
```

If you changed `ecosystem.config.cjs`:

```bash
pm2 reload ecosystem.config.cjs
pm2 save
```

---

## Post-deploy smoke checklist

- [ ] `https://weather.example.com` loads (valid TLS)
- [ ] Discover search returns places (DB + Mapbox / places seed)
- [ ] Map loads with `pk.` token
- [ ] Login OTP: email arrives via Resend (not console)
- [ ] Anon discover hits soft paywall after limit
- [ ] `curl -I https://weather.example.com` shows security headers (CSP / HSTS from middleware)
- [ ] Logs: `pm2 logs solviax` — no boot errors about `AUTH_SECRET` / `EMAIL_MODE` / `USE_MOCKS`
- [ ] Cron: after boot, log line mentioning scheduled nightly weather warm when `CRON_ENABLED=true`
- [ ] After reboot: `pm2 status` shows `solviax` online (`pm2 startup` + `pm2 save` done)

---

## Security notes (ops)

- Prefer **managed Postgres**; do not expose Postgres port publicly.
- Keep `AUTH_TRUST_HOST=true` only behind a trusted proxy.
- Set `CORS_ALLOWED_ORIGINS` to your real origins (no `*`).
- Upstash is recommended once you have more than one process or frequent restarts (in-memory rate limits reset otherwise).
- Known soft limits (MVP): anon cookie reset can mint new discover credits; harden later if needed.
- `npm audit` CI gates **critical** issues; review Dependabot PRs for Next/Expo transitive CVEs.

---

## What is *not* covered yet

| Item | Status |
|---|---|
| Production Dockerfile / Compose stack | Not shipped — VPS + **PM2** is the documented path |
| Blue/green / zero-downtime multi-instance | Out of scope; cron assumes one instance |
| Mobile store release (EAS) | Separate from this guide |
| CDN / object storage for images | App uses Mapbox / remote URLs today |

See also [TODO.md](./TODO.md) (ops + product backlog) and the short checklist in [README.md](./README.md#production-checklist).
