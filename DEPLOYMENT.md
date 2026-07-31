# WeatherTrip — production deployment

Guide for running the **web app + API** (`apps/web`) on a Linux VPS (e.g. UpCloud, Hetzner, DigitalOcean). The Expo app (`apps/mobile`) is built separately and talks to this API via `EXPO_PUBLIC_API_URL`.

There is **no** first-class Docker production image yet — deploy as a Node.js process behind a reverse proxy. Local Postgres is only for development (`docker compose`).

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
│  Next.js (node)  │  `npm run start` — UI + /api/* + Auth.js + cron
└────────┬─────────┘
         │
         ├──────────► PostgreSQL (managed or self-hosted)
         ├──────────► Upstash Redis REST (rate limits)
         ├──────────► Resend (OTP email)
         ├──────────► Mapbox (maps / geocoding / directions)
         └──────────► Open-Meteo (weather, no API key)
```

**Single Node process** is enough for MVP. Cron jobs (`CRON_ENABLED`) run inside the Next.js process via `instrumentation.ts` — do not run multiple app replicas unless you accept duplicate cron or move jobs out.

---

## Server software

### Minimum (Ubuntu 24.04 LTS example)

| Software | Why |
|---|---|
| **Node.js 20+** (22 LTS recommended) | Next.js runtime |
| **npm** | Comes with Node |
| **git** | Deploy from repo |
| **PostgreSQL 16** | App DB — *or* use a managed DB and skip local install |
| **nginx** *or* **Caddy** | Reverse proxy + TLS |
| **certbot** | Only if using nginx (Let’s Encrypt). Caddy handles TLS itself |
| **ufw** (or equivalent) | Firewall: 22, 80, 443 |
| **build tools** | `build-essential` / `python3` — needed for native deps (e.g. `sharp`) |

Optional:

| Software | Why |
|---|---|
| **pm2** or **systemd** | Process manager / auto-restart |
| **fail2ban** | SSH brute-force hardening |

### Install sketch (Ubuntu)

```bash
# Node 22 via NodeSource (or use nvm / fnm)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git build-essential python3

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

Put these in a file the process manager loads (e.g. `/var/www/weathertrip/apps/web/.env.production` or systemd `EnvironmentFile=`). **Never** commit secrets.

### Required in production

| Variable | Example / notes |
|---|---|
| `NODE_ENV` | `production` (set by `next start`) |
| `DATABASE_URL` | `postgresql://USER:PASS@HOST:5432/weathertrip?sslmode=require` |
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
| `EMAIL_FROM` | Verified Resend sender, e.g. `WeatherTrip <noreply@example.com>` |
| `CRON_ENABLED` | `true` in production (nightly weather cache warm) |

### Optional / defaults

| Variable | Default | Notes |
|---|---|---|
| `ANON_DISCOVER_LIMIT` | `3` | Soft paywall credits per anon cookie |
| `ANON_SHARE_BONUS_CAP` | `2` | Share redeem bonus cap |
| `ANON_IP_DISCOVER_LIMIT` | `10` | Cookie-less / device IP daily limit |
| `USE_MOCK_WEATHER` | `false` | Keep `false` in prod |
| `PORT` | `3000` | Must match reverse proxy upstream |

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

DATABASE_URL=postgresql://weathertrip:SECRET@db.example.com:5432/weathertrip?sslmode=require

EMAIL_MODE=resend
RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM=WeatherTrip <noreply@example.com>

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
git clone <YOUR_REPO_URL> weathertrip
cd weathertrip
npm install
```

### 2. Configure env

```bash
cp apps/web/.env.example apps/web/.env.production
# edit apps/web/.env.production with production values
```

Ensure the start command loads that file (see systemd example below), or export vars in the shell / process manager.

### 3. Database migrate (+ optional seed)

```bash
# From repo root — loads DATABASE_URL from env
export $(grep -v '^#' apps/web/.env.production | xargs)   # or use dotenv tooling
npm run db:migrate -w @weathertrip/web

# Optional: seed places (demo / denser Geonames)
npm run db:seed -w @weathertrip/web
# npm run db:seed:geonames -w @weathertrip/web
```

### 4. Build and run

```bash
cd /var/www/weathertrip
npm run build -w @weathertrip/web
npm run start -w @weathertrip/web
# listens on 0.0.0.0:3000 by default with `next start`
```

Smoke-test locally on the VPS:

```bash
curl -sI http://127.0.0.1:3000 | head
```

### 5. Process manager (systemd)

`/etc/systemd/system/weathertrip.service`:

```ini
[Unit]
Description=WeatherTrip Next.js
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/weathertrip
EnvironmentFile=/var/www/weathertrip/apps/web/.env.production
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start -w @weathertrip/web
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now weathertrip
sudo systemctl status weathertrip
```

Restrict file permissions on the env file:

```bash
sudo chown www-data:www-data /var/www/weathertrip/apps/web/.env.production
sudo chmod 600 /var/www/weathertrip/apps/web/.env.production
```

---

## Reverse proxy

Point DNS `A`/`AAAA` for `weather.example.com` at the VPS before issuing certificates.

### Option A — nginx + Let’s Encrypt

`/etc/nginx/sites-available/weathertrip`:

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
sudo ln -s /etc/nginx/sites-available/weathertrip /etc/nginx/sites-enabled/
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

---

## Updates (redeploy)

```bash
cd /var/www/weathertrip
git pull
npm install
npm run db:migrate -w @weathertrip/web
npm run build -w @weathertrip/web
sudo systemctl restart weathertrip
```

---

## Post-deploy smoke checklist

- [ ] `https://weather.example.com` loads (valid TLS)
- [ ] Discover search returns places (DB + Mapbox / places seed)
- [ ] Map loads with `pk.` token
- [ ] Login OTP: email arrives via Resend (not console)
- [ ] Anon discover hits soft paywall after limit
- [ ] `curl -I https://weather.example.com` shows security headers (CSP / HSTS from middleware)
- [ ] Logs: `journalctl -u weathertrip -f` — no boot errors about `AUTH_SECRET` / `EMAIL_MODE` / `USE_MOCKS`
- [ ] Cron: after boot, log line `[cron] scheduled nightly weather warm…` when `CRON_ENABLED=true`

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
| Production Dockerfile / Compose stack | Not shipped — VPS + systemd is the documented path |
| Blue/green / zero-downtime multi-instance | Out of scope; cron assumes one instance |
| Mobile store release (EAS) | Separate from this guide |
| CDN / object storage for images | App uses Mapbox / remote URLs today |

See also [TODO.md](./TODO.md) (ops + product backlog) and the short checklist in [README.md](./README.md#production-checklist).
