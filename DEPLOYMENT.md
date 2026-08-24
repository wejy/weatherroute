# Solviax.app — production deployment

Guide for running the **web app + API** (`apps/web`) on a Linux VPS (e.g. UpCloud, Hetzner, DigitalOcean). The Expo app (`apps/mobile`) is built separately and talks to this API via `EXPO_PUBLIC_API_URL` — see **[EXPO_DEPLOYMENT.md](./EXPO_DEPLOYMENT.md)** for store builds, EAS, and mobile env/token rules.

There is **no** first-class Docker production image yet — deploy as a Node.js process managed by **PM2**, behind a reverse proxy. Local Postgres is only for development (`docker compose`).

---

## Architecture (recommended)

```text
Internet
   │
   ▼
┌──────────────────┐
│  nginx           │  TLS, HTTP/2, gzip, proxy → :3004
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  PM2 → Next.js   │  `next start` — UI + /api/* + Auth.js + cron
└────────┬─────────┘
         │
         ├──────────► PostgreSQL (managed or self-hosted)
         ├──────────► Upstash Redis REST (rate limits — required in prod)
         ├──────────► Mailgun (OTP email; Resend optional)
         ├──────────► Mapbox (maps / geocoding / directions)
         └──────────► Open-Meteo (weather; commercial key → customer-api)
```

**Single Node process** is enough for MVP (`instances: 1` in PM2). Cron jobs (`CRON_ENABLED`) run inside the Next.js process via `instrumentation.ts` — do not run multiple app replicas unless you accept duplicate cron or move jobs out.

---



## Server software



### Minimum (Ubuntu 24.04 LTS example)


| Software                             | Why                                                                   |
| ------------------------------------ | --------------------------------------------------------------------- |
| **Node.js 20+** (22 LTS recommended) | Next.js runtime                                                       |
| **npm**                              | Comes with Node                                                       |
| **git**                              | Deploy from repo                                                      |
| **PM2**                              | Process manager, auto-restart, boot start, logs                       |
| **PostgreSQL 16**                    | App DB — *or* use a managed DB and skip local install                 |
| **nginx**                            | Reverse proxy + TLS + HTTP/2                                          |
| **certbot**                          | Let’s Encrypt certificates (`python3-certbot-nginx`)                  |
| **ufw** (or equivalent)              | Firewall: 22, 80, 443                                                 |
| **build tools**                      | `build-essential` / `python3` — needed for native deps (e.g. `sharp`) |


Optional:


| Software                | Why                                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| **unattended-upgrades** | Automatic security patches (+ optional reboot) — see [Automatic security updates](#automatic-security-updates) |
| **fail2ban**            | SSH brute-force hardening                                                                                      |


External (not installed on the VPS): **Upstash Redis REST** — required for production rate limits (see [Upstash Redis](#upstash-redis-required)). **PgBouncer is not required** for the documented single-instance setup (see [PostgreSQL & pooling](#postgresql--pooling)).

### Install sketch (Ubuntu)

```bash
# Node 22 via NodeSource (or use nvm / fnm)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git build-essential python3

# PM2 (global)
sudo npm install -g pm2
sudo pm2 install pm2-logrotate

# Reverse proxy + TLS
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Automatic security updates (see dedicated section below)
sudo apt-get install -y unattended-upgrades apt-listchanges

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


| Variable                   | Example / notes                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| `NODE_ENV`                 | `production` (set by `next start` / PM2)                                                      |
| `DATABASE_URL`             | `postgresql://USER:PASS@HOST:5432/solviax?sslmode=require`                                    |
| `AUTH_SECRET`              | Random ≥ **32** chars (`openssl rand -base64 48`)                                             |
| `AUTH_URL`                 | `https://solviax.app` (canonical public URL)                                                  |
| `NEXT_PUBLIC_APP_URL`      | Same as `AUTH_URL`                                                                            |
| `EMAIL_MODE`               | `mailgun` (or `resend`; `console` is **rejected** at boot)                                    |
| `MAILGUN_API_KEY`          | Required when `EMAIL_MODE=mailgun` — [Mailgun](https://www.mailgun.com/) private API key      |
| `MAILGUN_DOMAIN`           | Verified sending domain (e.g. `mg.solviax.app`)                                               |
| `MAILGUN_API_BASE_URL`     | Default `https://api.eu.mailgun.net` (EU); use `https://api.mailgun.net` for US               |
| `RESEND_API_KEY`           | Only if `EMAIL_MODE=resend`                                                                   |
| `USE_MOCKS`                | `false` (`true` is **rejected** at boot)                                                      |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Public token starting with `pk.` (browser map)                                                |
| `MAPBOX_ACCESS_TOKEN`      | Server token (`pk.` or `sk.`) for geocoding / directions                                      |
| `OPEN_METEO_API_KEY`       | Open-Meteo **commercial** API key — switches weather to `https://customer-api.open-meteo.com` |




### Required for rate limits (production)

Without these, production **deny-alls** rate-limited routes (no in-memory fallback).


| Variable                   | Notes                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `UPSTASH_REDIS_REST_URL`   | From Upstash console → Redis → REST API (see [Upstash Redis](#upstash-redis-required)) |
| `UPSTASH_REDIS_REST_TOKEN` | Pair with URL above                                                                    |




### Strongly recommended


| Variable                  | Notes                                                                             |
| ------------------------- | --------------------------------------------------------------------------------- |
| `AUTH_TRUST_HOST`         | `true` **only** behind nginx / Cloudflare that you control                        |
| `CORS_ALLOWED_ORIGINS`    | `https://solviax.app` (+ Expo origins only if needed; no localhost in prod)       |
| `EMAIL_FROM`              | Verified sender, e.g. `Solviax.app <noreply@solviax.app>` (Mailgun/Resend domain) |
| `CRON_ENABLED`            | `true` in production (weather cache warm at 02:00/10:00/18:00 UTC)                |
| `CRON_WEATHER_WARM_LIMIT` | Max places per warm run (default `400`; usage + Nordic/Baltic/DE + global fill)   |




### Stripe billing (required for `/pro` checkout)

Without these, the Pro page shows plans but checkout stays disabled.


| Variable                | Notes                                                                         |
| ----------------------- | ----------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`     | **Live** secret `sk_live_…` (Dashboard → Developers → API keys)               |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the **production** webhook endpoint (`whsec_…`)            |
| `STRIPE_PRICE_ONE_TIME` | Live Price id for **€1.99** one-time Pro (`mode=payment`, 60 days, VAT incl.) |
| `STRIPE_PRICE_MONTHLY`  | Live Price id for **€2.99 / month** Pro (`mode=subscription`, VAT incl.)      |
| `STRIPE_PRICE_YEARLY`   | Live Price id for **€30 / year** Pro (`mode=subscription`, VAT incl.)         |


See **[Stripe (production)](#stripe-production)** below for Dashboard steps. Product details: [PAID_FEATURES.md](./PAID_FEATURES.md).

### Admin cost estimates (optional)

`/admin` estimates ops + API spend and paying revenue using `ADMIN_COST_*` / `ADMIN_PRICE_*` / `ADMIN_STRIPE_*` (EUR). Defaults are documented in `apps/web/.env.example`. Admins are granted only via DB (`users.role = 'admin'`), never via API.

### Optional / defaults


| Variable                         | Default                       | Notes                                                                                                                 |
| -------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `ANON_DISCOVER_LIMIT`            | `3`                           | Soft paywall credits per anon cookie                                                                                  |
| `ANON_SHARE_BONUS_CAP`           | `2`                           | Share redeem bonus cap                                                                                                |
| `ANON_IP_DISCOVER_LIMIT`         | `10`                          | Per-IP discover cap / 24h (layered with cookie)                                                                       |
| `ANON_SESSION_MINT_LIMIT`        | `20`                          | New anon sessions per IP / 24h                                                                                        |
| `FREE_MONTHLY_DISCOVER_LIMIT`    | `50`                          | Signed-in Free discovers per UTC calendar month                                                                       |
| `PRO_MONTHLY_DISCOVER_LIMIT`     | `200`                         | Monthly Pro fair-use discovers / UTC month                                                                            |
| `PRO_ONE_TIME_DISCOVER_LIMIT`    | `400`                         | One-time Pro fair-use discovers / 60-day window                                                                       |
| `USE_MOCK_WEATHER`               | `false`                       | Keep `false` in prod                                                                                                  |
| `OPEN_METEO_API_BASE_URL`        | *(auto)*                      | Override forecast host; default is `customer-api` when key is set, else `api.open-meteo.com`                          |
| `PORT`                           | `3004`                        | Must match reverse proxy upstream                                                                                     |
| `LOG_LEVEL`                      | `info` (prod) / `debug` (dev) | Pino via `@solviax/logger` — JSON stdout in production                                                                |
| `LOG_PRETTY`                     | pretty on in dev              | Set `0` to force JSON locally                                                                                         |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`  | *(unset)*                     | GA4 id `G-…` — loads **only after** cookie consent (see [docs/COOKIE_CONSENT_PLAN.md](./docs/COOKIE_CONSENT_PLAN.md)) |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | *(unset)*                     | reCAPTCHA v3 site key (login OTP)                                                                                     |
| `RECAPTCHA_SECRET_KEY`           | *(unset)*                     | reCAPTCHA secret (server verify)                                                                                      |




### Example production env file

```bash
NODE_ENV=production
PORT=3004

NEXT_PUBLIC_APP_URL=https://solviax.app
AUTH_URL=https://solviax.app
AUTH_SECRET=REPLACE_WITH_openssl_rand_base64_48
AUTH_TRUST_HOST=true

USE_MOCKS=false
USE_MOCK_WEATHER=false

# Open-Meteo commercial (required for production commercial use)
OPEN_METEO_API_KEY=REPLACE_WITH_OPEN_METEO_KEY
# OPEN_METEO_API_BASE_URL=https://customer-api.open-meteo.com

DATABASE_URL=postgresql://solviax:SECRET@db.example.com:5432/solviax?sslmode=require

EMAIL_MODE=mailgun
MAILGUN_API_KEY=key-xxxxxxxx
MAILGUN_DOMAIN=mg.solviax.app
MAILGUN_API_BASE_URL=https://api.eu.mailgun.net
EMAIL_FROM=Solviax.app <noreply@solviax.app>

CORS_ALLOWED_ORIGINS=https://solviax.app

UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxx

NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxxx
MAPBOX_ACCESS_TOKEN=pk.xxxx

CRON_ENABLED=true
CRON_WEATHER_WARM_LIMIT=400
ANON_DISCOVER_LIMIT=3
ANON_IP_DISCOVER_LIMIT=10

STRIPE_SECRET_KEY=sk_live_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx
STRIPE_PRICE_ONE_TIME=price_xxxx
STRIPE_PRICE_MONTHLY=price_xxxx
STRIPE_PRICE_YEARLY=price_xxxx
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

      // Cron runs inside this process — keep a single fork
      instances: 1,
      exec_mode: "fork",
      watch: false,

      autorestart: true,
      max_restarts: 20,
      min_uptime: "10s",
      exp_backoff_restart_delay: 200, // ms; backs off on crash loops
      kill_timeout: 10_000, // allow Next.js to finish in-flight work
      listen_timeout: 10_000,
      max_memory_restart: "1G",

      // Timestamps in `pm2 logs`
      time: true,
      merge_logs: true,
      out_file: "/var/log/solviax/out.log",
      error_file: "/var/log/solviax/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      env: {
        NODE_ENV: "production",
        PORT: "3004",
      },
    },
  ],
};
```

Prepare log directory (once):

```bash
sudo mkdir -p /var/log/solviax
sudo chown "$USER":"$USER" /var/log/solviax
```

`instances` must stay **1** while cron runs inside the Next.js process. Do not use `exec_mode: "cluster"` unless you move cron out of the app.

#### Log rotation

```bash
sudo pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 20M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:workerInterval 3600
```



#### Start and survive reboots

```bash
cd /var/www/solviax
pm2 start ecosystem.config.cjs
pm2 status
pm2 save
pm2 startup
# run the command PM2 prints, e.g.:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u <user> --hp /home/<user>
```

After any kernel reboot (manual or from unattended-upgrades), `pm2 resurrect` via the systemd unit restores the process dump from `pm2 save`. Verify once with `sudo reboot` on a staging box.

Useful day-to-day commands:

```bash
pm2 status
pm2 logs solviax          # follow app + Pino stdout
pm2 logs solviax --lines 200
pm2 monit                 # CPU / memory
pm2 restart solviax
pm2 reload solviax        # graceful when possible (fork mode ≈ restart)
pm2 stop solviax
pm2 delete solviax
pm2 save                  # after config changes you want after reboot
```

Smoke-test on the VPS:

```bash
curl -sI http://127.0.0.1:3004 | head
```

---



## Automatic security updates

On Ubuntu, use **unattended-upgrades** so security patches land without waiting for a manual SSH session. Configure a controlled reboot window so kernel updates apply safely; PM2 + nginx come back via systemd.

### 1. Install and enable

```bash
sudo apt-get install -y unattended-upgrades apt-listchanges
sudo dpkg-reconfigure -plow unattended-upgrades
# Answer Yes to “automatically download and install stable updates”
```

Confirm the timer/service:

```bash
systemctl status unattended-upgrades --no-pager
cat /etc/apt/apt.conf.d/20auto-upgrades
```

Expected `20auto-upgrades`:

```text
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
```



### 2. Security-only + automatic reboot

Edit `/etc/apt/apt.conf.d/50unattended-upgrades` (create overrides if your distro ships a different layout):

```text
// Only security pockets (default on Ubuntu is already security-focused)
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};

// Remove unused deps after upgrades
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "true";
// Local time — pick a quiet window (e.g. 04:00 Europe/Helsinki on the VPS TZ)
Unattended-Upgrade::Automatic-Reboot-Time "04:00";
Unattended-Upgrade::Automatic-Reboot-WithUsers "true";

// Optional: email when something needs attention (needs mail setup)
// Unattended-Upgrade::Mail "ops@example.com";
```

Set the server timezone so reboot time is predictable:

```bash
sudo timedatectl set-timezone Europe/Helsinki
timedatectl
```



### 3. What happens after a reboot


| Unit         | Expected                                                             |
| ------------ | -------------------------------------------------------------------- |
| **nginx**    | `systemd` enables it by default → listens 80/443                     |
| **PM2**      | `pm2 startup` systemd unit → restores `solviax` from last `pm2 save` |
| **Postgres** | Managed DB: always on; self-hosted: `postgresql` systemd unit        |


After the first reboot, check:

```bash
sudo reboot
# … wait …
ssh you@vps
systemctl is-active nginx
pm2 status
curl -sI https://solviax.app | head
```



### 4. Optional dry-run

```bash
sudo unattended-upgrade --dry-run --debug 2>&1 | tail -40
```

Do **not** enable fully automatic upgrades of Node.js from NodeSource without testing — stick to Ubuntu **security** origins for the OS, and bump Node / app deps via your redeploy process.

---



## PostgreSQL & pooling

**You do not need PgBouncer** for the recommended MVP topology (one PM2 process → managed Postgres).

The app uses `postgres.js` with a small shared pool (`max: 5` by default in `apps/web/src/db/index.ts`, override with `DATABASE_POOL_MAX`). One Node process × ~5 connections fits small managed plans (~25 `max_connections`, some reserved for SUPERUSER).


| Situation                                                                 | Recommendation                                                                                                                                                        |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single PM2 instance + managed Postgres                                    | **No PgBouncer** — current pool is enough                                                                                                                             |
| Managed DB with built-in pooler (Neon pooler, Supabase pooler, RDS Proxy) | Use the provider’s **pooled** connection string if they recommend it for serverless/short-lived clients; for a long-lived Node process the direct URL is usually fine |
| Many app replicas / high connection count                                 | Then add PgBouncer (transaction mode) or a managed pooler — and move cron out of the app first                                                                        |
| Self-hosted Postgres on the same VPS                                      | Still skip PgBouncer until you scale; prefer managed DB instead                                                                                                       |


Tips:

- Prefer `?sslmode=require` (or provider equivalent) on `DATABASE_URL`.
- Do not expose Postgres `5432` on the public internet (`ufw` / security group).
- If a managed plan warns about connection saturation (`remaining connection slots are reserved for roles with the SUPERUSER attribute`), restart the app so leaked clients drop, lower `DATABASE_POOL_MAX` (default `5`), or upgrade the plan before introducing PgBouncer.
- Ensure only **one** PM2 process talks to the DB while cron runs in-process (`instances: 1`).

---



## Reverse proxy (nginx)

Point DNS `A`/`AAAA` for `solviax.app` at the VPS before issuing certificates. Set `AUTH_TRUST_HOST=true` in `.env.production` once nginx terminates TLS in front of Next.js.

### Global hardening (once per host)

`/etc/nginx/nginx.conf` — inside the `http { }` block, ensure:

```nginx
http {
    # Hide nginx version from Server header / error pages
    server_tokens off;

    # Compression (Next.js payloads + JSON APIs)
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_types
        text/plain
        text/css
        text/javascript
        application/javascript
        application/json
        application/xml
        image/svg+xml
        font/woff2;

    # Reasonable defaults for reverse-proxied Node
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10m;

    # … include /etc/nginx/sites-enabled/*;
}
```

Optional: install `libnginx-mod-http-brotli` (distro-dependent) and enable `brotli on;` for extra compression. Gzip alone is enough for MVP.

### Site config + Let’s Encrypt

`/etc/nginx/sites-available/solviax`:

```nginx
# Redirect all HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name solviax.app;

    # ACME HTTP-01 (certbot); keep before the redirect if you renew with webroot
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
        default_type "text/plain";
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

upstream solviax_next {
    server 127.0.0.1:3004;
    keepalive 32;
}

server {
    # Ubuntu 24.04 / nginx 1.24: http2 flag on listen.
    # nginx ≥ 1.25.1 may prefer: listen 443 ssl; listen [::]:443 ssl; http2 on;
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name solviax.app;

    # certbot --nginx fills these (or set manually after first issue):
    ssl_certificate     /etc/letsencrypt/live/solviax.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/solviax.app/privkey.pem;
    # Recommended extras (certbot often drops ssl-dhparams):
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Modern TLS (options-ssl-nginx.conf usually already sets protocols/ciphers)
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 1.1.1.1 8.8.8.8 valid=300s;
    resolver_timeout 5s;

    # HSTS — also set by Next middleware; edge copy is fine
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Defense-in-depth (middleware also sends CSP / nosniff / etc.)
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    client_max_body_size 10m;

    # Next.js (App Router, RSC, websockets / HMR not used in prod)
    location / {
        proxy_pass http://solviax_next;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        # Trust this nginx as the only edge: do NOT append client-supplied XFF
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "";

        proxy_connect_timeout 10s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;

        # Buffering helps large discover JSON; disable if you stream later
        proxy_buffering on;
        proxy_buffers 16 32k;
        proxy_buffer_size 32k;
    }
}
```

Enable and issue the certificate:

```bash
sudo mkdir -p /var/www/certbot
sudo ln -sf /etc/nginx/sites-available/solviax /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# First certificate (opens 80, writes ssl paths into the site or use --nginx)
sudo certbot --nginx -d solviax.app

sudo nginx -t && sudo systemctl reload nginx
```

Confirm HTTP/2 and headers:

```bash
curl -sI --http2 https://solviax.app | head -20
# Expect: HTTP/2 200  (or 3xx), and HSTS / nosniff
```



### Cloudflare (optional)

If Cloudflare sits in front of nginx, enable **Authenticated Origin Pulls** or at least restrict origin to CF IPs, and use nginx `real_ip` so rate limits see the visitor IP:

```nginx
# Inside the HTTPS server block — keep CF IP lists updated:
# https://www.cloudflare.com/ips/
set_real_ip_from 173.245.48.0/20;
# … remaining Cloudflare ranges …
real_ip_header CF-Connecting-IP;
```

Then set `proxy_set_header X-Forwarded-For $remote_addr;` as above (after `real_ip` rewrites `$remote_addr`).

---



## Upstash Redis (required)

Production rate limiting uses **Upstash Redis REST** (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`). There is **no** in-memory fallback when `NODE_ENV=production`: missing or unreachable Upstash causes limited routes to **deny** (fail-closed).

You do **not** install Redis on the VPS. The app talks to Upstash over HTTPS REST (not `redis://`).

### 1. Create a database

1. Sign up at [upstash.com](https://upstash.com) → **Redis** → **Create database**.
2. Pick a region **close to your VPS** (lower latency for every rate-limited API call).
3. Type: **Regional** is fine for MVP. Enable **TLS** (default).
4. After create, open the database → **REST API** tab.
5. Copy:
  - `UPSTASH_REDIS_REST_URL` — looks like `https://<id>.upstash.io`
  - `UPSTASH_REDIS_REST_TOKEN` — long secret token



### 2. Put credentials in production env

```bash
# apps/web/.env.production
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxx
```

```bash
chmod 600 /var/www/solviax/apps/web/.env.production
pm2 restart solviax
```

Free tier is enough for OTP / discover / search rate limits at early traffic. Watch the Upstash dashboard if you scale.

### 3. Verify

```bash
# From the VPS — should return PONG (or similar) with your token
curl -sS "$UPSTASH_REDIS_REST_URL/ping" \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"

# App smoke: anonymous discover should count toward limits, not 429 everything
curl -sI "https://solviax.app/api/discover?origin=Helsinki" | head
```

If Upstash env vars are missing in production, expect rate-limited endpoints to fail closed (clients see 429 / blocked) until Redis is configured.

---



## External services checklist

1. **Postgres** — create DB + user; run migrations; prefer TLS (`sslmode=require`).
2. **Upstash Redis REST** — create DB; set URL + token ([steps above](#upstash-redis-required)).
3. **Mailgun** — verify domain (SPF/DKIM), set `EMAIL_MODE=mailgun` + `MAILGUN_API_KEY` + `MAILGUN_DOMAIN` (+ EU base URL if needed). OTP emails are HTML+text; first-time users get a welcome blurb. Resend remains supported via `EMAIL_MODE=resend`.
4. **Mapbox** — create tokens; restrict `pk.` by URL; never expose `sk.` to the client (`NEXT_PUBLIC_`* must stay `pk.`).
5. **Open-Meteo** — for commercial production set `OPEN_METEO_API_KEY` (uses `https://customer-api.open-meteo.com`). Leave unset only for local/non-commercial free API.
6. **Stripe** — live products/prices, webhook to `https://…/api/stripe/webhook`, Customer Portal (see below).
7. **DNS** — point domain at VPS; wait for propagation before TLS.

---



## Stripe (production)

Paid plans (VAT-inclusive 25.5%): **One-time €1.99** (60 days, max 2 saved routes), **Monthly €2.99** (unlimited saves), and **Yearly €30** (unlimited saves). All unlock Pro discover features. Full matrix: [PAID_FEATURES.md](./PAID_FEATURES.md).

### 1. Create live products / prices

In [Stripe Dashboard](https://dashboard.stripe.com) (toggle **Live** mode):


| Product                    | Price                        | Checkout mode  |
| -------------------------- | ---------------------------- | -------------- |
| Solviax.app Pro — One-time | €1.99 EUR, one-time          | `payment`      |
| Solviax.app Pro — Monthly  | €2.99 EUR, recurring monthly | `subscription` |
| Solviax.app Pro — Yearly   | €30.00 EUR, recurring yearly | `subscription` |


Or from a machine with the **live** secret key:

```bash
STRIPE_SECRET_KEY=sk_live_... npm run stripe:setup -w @solviax/web
```

Copy the printed `STRIPE_PRICE_ONE_TIME` / `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY` into `.env.production`.

### 2. Webhook endpoint

Dashboard → **Developers → Webhooks → Add endpoint**:

- URL: `https://solviax.app/api/stripe/webhook`
- Events (minimum):
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

Copy the endpoint **Signing secret** → `STRIPE_WEBHOOK_SECRET` (this is **not** the same as the Stripe CLI `whsec_` used in local dev).

Reverse proxy already forwards `/` to Next.js — no extra nginx location is required for the webhook path.

### 3. Customer Portal

Dashboard → **Settings → Billing → Customer portal**:

- [x] Enable portal for customers
- [x] **Cancel subscriptions** ON
- [x] **Invoice history** / download invoices ON
- [x] Return URL / branding: `https://solviax.app/pro` (app opens portal from Pro & Settings → **Manage billing**)

Users with a `stripe_customer_id` (one-time or monthly) can open the portal for cancel + receipts.

### 4. App URL

`NEXT_PUBLIC_APP_URL` / `AUTH_URL` must be the public `https://…` origin. Checkout success/cancel redirects use this base (`/pro?checkout=…`).

### 5. Migrate before go-live

Billing columns live in migrations `0002_billing_plans` and `0008_pro_since`. Always run after deploy:

```bash
set -a && source apps/web/.env.production && set +a
npm run db:migrate -w @solviax/web
```



### 6. Smoke-test payments

1. Use a live card only after you are ready to charge — prefer Stripe **test mode** on staging first.
2. Complete One-time and Monthly checkout from `/pro` while signed in.
3. Confirm `subscriptions` row: `status=active`, `plan=one_time|monthly`.
4. Incomplete / unpaid checkouts must **not** grant Pro (see webhook hardening in [PAID_FEATURES.md](./PAID_FEATURES.md)).
5. Cancel Monthly via Customer Portal → user should fall back to One-time if they bought it earlier, else Free.

---



## Mobile (Expo)

Mobile does **not** run on the VPS. Point builds at the production API:

```bash
# apps/mobile/.env (EAS / local release builds)
EXPO_PUBLIC_API_URL=https://solviax.app
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



## Production checklist (security go-live)

Config and edge requirements before public traffic. (Smoke tests after deploy: [Post-deploy smoke checklist](#post-deploy-smoke-checklist).)

### Edge / identity (rate limits & anon quotas)

- [x] Reverse proxy **replaces** client IP headers (do not append untrusted `X-Forwarded-For`). nginx: `proxy_set_header X-Forwarded-For $remote_addr;` (+ `X-Real-IP` / Cloudflare `real_ip` as documented above).
- [x] Confirm spoofing fails: request with forged `X-Forwarded-For` still rate-limits on the real edge IP.



### Config

- [x] `CORS_ALLOWED_ORIGINS=https://solviax.app` (no localhost / Expo ports in prod)
- [x] `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` set; `curl …/ping` → `PONG` (required — missing Redis = deny-all on limited routes)
- [x] Alert/monitor Upstash failures (prod without Redis looks like global 429)
- [x] `EMAIL_MODE=mailgun` + verified domain (or `resend`); `**LOG_OTP_CODE` unset**
- [x] Stripe live: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ONE_TIME` | `MONTHLY` | `YEARLY`
- [x] nginx / Cloudflare in front — **do not expose** Next.js `:3004` publicly
- [x] `AUTH_SECRET` ≥ 32 chars · `USE_MOCKS=false` · `AUTH_TRUST_HOST=true` only behind a trusted proxy
- [x] Mapbox: `NEXT_PUBLIC_MAPBOX_TOKEN` is `**pk.**` only; URL restrictions on the token; `MAPBOX_ACCESS_TOKEN` `sk.` never in `NEXT_PUBLIC_*`
- [x] Open-Meteo: `OPEN_METEO_API_KEY` set for commercial production (`customer-api.open-meteo.com`)
- [x] **EU analytics:** if `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set, cookie banner + Consent Mode v2 must be live (GA loads only after opt-in; reject → no `_ga` cookies)
- [ ] Mobile store / TestFlight builds: `EXPO_PUBLIC_API_URL=https://solviax.app` (HTTPS only)
- [ ] Smoke: OTP email · checkout One-time / Monthly / Yearly · webhook updates `subscriptions.plan`



### Accessibility (light theme)

- [ ] Light primary token is AA-capable for both CTA fill (`text-on-primary`) and `text-primary` links (see `globals.css` light `--primary`)
- [ ] Do **not** claim WCAG 2.2 AA until contrast is verified in the deployed theme (axe / manual)

---



## Post-deploy smoke checklist

- [ ] `https://solviax.app` loads (valid TLS, **HTTP/2**)
- [x] Upstash: `ping` works; discover/search are not globally deny-all’d
- [x] Discover search returns places (DB + Mapbox / places seed)
- [x] Map loads with `pk.` token
- [x] Login OTP: HTML email arrives via Mailgun (or Resend; not console); `LOG_OTP_CODE` not set
- [ ] Anon discover hits soft paywall after limit
- [ ] `curl -sI --http2 https://solviax.app` shows HSTS / nosniff (nginx + middleware)
- [ ] Logs: `pm2 logs solviax` — no boot errors about `AUTH_SECRET` / `EMAIL_MODE` / `USE_MOCKS` / Upstash
- [ ] Cron: after boot, log line mentioning weather warm at 02:00/10:00/18:00 UTC when `CRON_ENABLED=true`
- [ ] After reboot: `pm2 status` shows `solviax` online (`pm2 startup` + `pm2 save` done)
- [ ] `unattended-upgrades` enabled; reboot window set; nginx + PM2 recover after test reboot
- [ ] Stripe: `/pro` shows Buy / Subscribe (keys set); webhook endpoint healthy in Dashboard
- [ ] Stripe: test One-time + Monthly + Yearly checkout; `subscriptions.plan` updates after webhook
- [ ] Stripe: Customer Portal opens from Settings → Manage billing
- [ ] Origin not reachable on public `:3004` (only 80/443 via reverse proxy)
- [ ] Mobile: store build points at `https://solviax.app` (`EXPO_PUBLIC_API_URL`)

---



## Security notes (ops)

- Prefer **managed Postgres**; do not expose Postgres port publicly. **PgBouncer not required** for one PM2 instance.
- Keep `AUTH_TRUST_HOST=true` only behind **nginx** (or Cloudflare + nginx) that you control.
- Set `CORS_ALLOWED_ORIGINS` to your real origins (no `*`, no leftover localhost in prod).
- **Upstash Redis REST is required in production** — without it, rate-limited routes deny all traffic. Local `.env.local` may already have Upstash; prod must too.
- nginx must set `X-Forwarded-For` / `X-Real-IP` from `$remote_addr` (or Cloudflare `real_ip`) so clients cannot spoof IPs used for quotas — **replace**, do not append client-supplied values.
- Who can set `users.role = admin`? Only trusted DB/ops — seed scripts must not run against prod with open admin emails.
- `/api/weather` (and similar) are public + IP rate-limited, not paywalled — accept cost risk or gate later.
- Anon cookie rotation is mitigated with IP discover caps + per-IP session mint limits.
- Keep `server_tokens off`, TLS 1.2+, HSTS, and HTTP→HTTPS redirect on nginx.
- Enable **unattended-upgrades** (security pocket) + a quiet automatic reboot window; verify PM2 survives reboot.
- `npm audit` CI gates **critical** issues; review Dependabot PRs for Next/Expo transitive CVEs.
- CSP uses per-request **script nonces** + `'strict-dynamic'` (no `'unsafe-inline'` / `'unsafe-eval'` on scripts in production). Theme boot and Google Consent Mode default scripts are allowlisted via **sha256** hashes. `style-src` still allows `'unsafe-inline'` for Mapbox GL injected styles — treat style-injection XSS as residual risk.
- OTP verify may return a session JWT in JSON for mobile — avoid logging response bodies.

---



## What is *not* covered yet


| Item                                      | Status                                             |
| ----------------------------------------- | -------------------------------------------------- |
| Production Dockerfile / Compose stack     | Not shipped — VPS + **PM2** is the documented path |
| Blue/green / zero-downtime multi-instance | Out of scope; cron assumes one instance            |
| Mobile store release (EAS)                | Separate from this guide                           |
| CDN / object storage for images           | App uses Mapbox / remote URLs today                |
| Stripe Tax / invoices / VAT ID collection | Not configured — enable in Stripe if you need them |


See also [TODO.md](./TODO.md) (ops + product backlog) and the short checklist in [README.md](./README.md#production-checklist).