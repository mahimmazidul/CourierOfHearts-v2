#!/usr/bin/env bash
set -euo pipefail

APP_NAME="courier-of-hearts"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_ENV_FILE="${REPO_ROOT}/.deploy.env"

load_env_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$file"
    set +a
  fi
}

prompt_value() {
  local var_name="$1"
  local prompt_text="$2"
  local default_value="${3:-}"
  local secret="${4:-false}"
  local current_value="${!var_name:-}"
  if [[ -n "$current_value" ]]; then return; fi
  local answer=""
  if [[ "$secret" == "true" ]]; then
    read -r -s -p "$prompt_text${default_value:+ [$default_value]}: " answer
    echo
  else
    read -r -p "$prompt_text${default_value:+ [$default_value]}: " answer
  fi
  answer="${answer:-$default_value}"
  printf -v "$var_name" '%s' "$answer"
  export "$var_name"
}

prompt_bool() {
  local var_name="$1"
  local prompt_text="$2"
  local default_value="${3:-false}"
  local current_value="${!var_name:-}"
  if [[ -n "$current_value" ]]; then return; fi
  local answer
  read -r -p "$prompt_text [${default_value}] (true/false): " answer
  answer="${answer:-$default_value}"
  case "${answer,,}" in
    true|false) ;;
    yes) answer="true" ;;
    no) answer="false" ;;
    *) echo "Please answer true or false."; exit 1 ;;
  esac
  printf -v "$var_name" '%s' "$answer"
  export "$var_name"
}

generate_if_empty() {
  local var_name="$1"
  if [[ -z "${!var_name:-}" ]]; then
    printf -v "$var_name" '%s' "$(openssl rand -hex 32)"
    export "$var_name"
  fi
}

save_deploy_env() {
  cat > "$DEPLOY_ENV_FILE" <<EOF
DOMAIN=${DOMAIN}
ADDITIONAL_DOMAINS=${ADDITIONAL_DOMAINS}
APP_ROOT=${APP_ROOT}
PUBLIC_ROOT=${PUBLIC_ROOT}
API_PORT=${API_PORT}
API_HOST=${API_HOST}
JWT_SECRET=${JWT_SECRET}
LETTER_MASTER_KEY=${LETTER_MASTER_KEY}
ADMIN_API_ENABLED=${ADMIN_API_ENABLED}
ADMIN_MASTER_KEY=${ADMIN_MASTER_KEY}
MYSQL_MIRROR_URL=${MYSQL_MIRROR_URL}
VITE_ENABLE_ADMIN_PANEL=${VITE_ENABLE_ADMIN_PANEL}
VITE_ADMIN_ROUTE=${VITE_ADMIN_ROUTE}
ENABLE_UFW=${ENABLE_UFW}
CERTBOT_EMAIL=${CERTBOT_EMAIL}
EOF
}

load_env_file "$REPO_ROOT/.env"
load_env_file "$DEPLOY_ENV_FILE"

prompt_value DOMAIN "Primary domain for this app" "letters.example.com"
prompt_value ADDITIONAL_DOMAINS "Additional domains (comma-separated, optional)" ""
prompt_value APP_ROOT "Frontend files directory" "/var/www/${APP_NAME}"
prompt_value PUBLIC_ROOT "Server app directory" "/var/lib/${APP_NAME}"
prompt_value API_PORT "Internal API port" "3847"
prompt_value API_HOST "Internal API host" "127.0.0.1"
prompt_value JWT_SECRET "JWT secret (leave blank to auto-generate)" "" true
generate_if_empty JWT_SECRET
prompt_value LETTER_MASTER_KEY "Letter master encryption key (leave blank to auto-generate)" "" true
generate_if_empty LETTER_MASTER_KEY
prompt_bool ADMIN_API_ENABLED "Enable admin API + admin panel" "false"
prompt_value VITE_ADMIN_ROUTE "Admin route segment" "sudo"
if [[ "${ADMIN_API_ENABLED}" == "true" ]]; then
  prompt_value ADMIN_MASTER_KEY "Admin master key (leave blank to auto-generate)" "" true
  generate_if_empty ADMIN_MASTER_KEY
  VITE_ENABLE_ADMIN_PANEL="true"
else
  ADMIN_MASTER_KEY=""
  VITE_ENABLE_ADMIN_PANEL="false"
fi
prompt_value MYSQL_MIRROR_URL "Optional MySQL/MariaDB mirror DSN (leave blank to skip)" ""
prompt_bool ENABLE_UFW "Apply simple UFW firewall rules (22/80/443 only)" "true"
prompt_value CERTBOT_EMAIL "Certbot email (optional, leave blank to skip TLS setup)" ""

SERVER_NAMES="${DOMAIN}"
CORS_ORIGINS="https://${DOMAIN}"
CERTBOT_DOMAINS=("-d" "${DOMAIN}")
if [[ -n "${ADDITIONAL_DOMAINS}" ]]; then
  IFS=',' read -r -a EXTRA_DOMAIN_ARRAY <<< "${ADDITIONAL_DOMAINS}"
  for raw_domain in "${EXTRA_DOMAIN_ARRAY[@]}"; do
    domain_trimmed="$(echo "$raw_domain" | xargs)"
    [[ -z "$domain_trimmed" ]] && continue
    SERVER_NAMES+=" ${domain_trimmed}"
    CORS_ORIGINS+=",https://${domain_trimmed}"
    CERTBOT_DOMAINS+=("-d" "${domain_trimmed}")
  done
fi

save_deploy_env

echo "==> Installing dependencies"
cd "$REPO_ROOT"
npm ci

echo "==> Building frontend"
VITE_API_BASE_URL="/api/v1" VITE_ENABLE_ADMIN_PANEL="$VITE_ENABLE_ADMIN_PANEL" VITE_ADMIN_ROUTE="$VITE_ADMIN_ROUTE" VITE_SINGLEFILE=false npm run build

echo "==> Preparing server directories"
sudo mkdir -p "$APP_ROOT" "$PUBLIC_ROOT" /etc/${APP_NAME} "$PUBLIC_ROOT/data" "$PUBLIC_ROOT/cache" "$PUBLIC_ROOT/server/data" "/var/backups/${APP_NAME}"
sudo rsync -a --delete dist/ "$APP_ROOT/"
sudo rsync -a package.json package-lock.json node_modules server scripts "$PUBLIC_ROOT/"
if sudo test -f "${PUBLIC_ROOT}/server/data/letters.json"; then
  echo "==> Found legacy JSON file at ${PUBLIC_ROOT}/server/data/letters.json"
else
  echo "==> No legacy JSON file found at ${PUBLIC_ROOT}/server/data/letters.json"
fi

TMP_ENV="$(mktemp)"
cat > "$TMP_ENV" <<EOF
APP_NAME=${APP_NAME}
NODE_ENV=production
HOST=${API_HOST}
PORT=${API_PORT}
DB_FILE=${PUBLIC_ROOT}/data/letters.db
LEGACY_DATA_FILE=${PUBLIC_ROOT}/server/data/letters.json
CACHE_DIR=${PUBLIC_ROOT}/cache
CORS_ORIGIN=${CORS_ORIGINS}
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=365d
LETTER_MASTER_KEY=${LETTER_MASTER_KEY}
ADMIN_API_ENABLED=${ADMIN_API_ENABLED}
ADMIN_MASTER_KEY=${ADMIN_MASTER_KEY}
MYSQL_MIRROR_URL=${MYSQL_MIRROR_URL}
MAX_FLOWERS=50
BODY_LIMIT_BYTES=131072
DAILY_CACHE_TTL_MS=86400000
EOF
sudo install -m 640 "$TMP_ENV" "/etc/${APP_NAME}/.env"
rm -f "$TMP_ENV"

SERVICE_FILE="/etc/systemd/system/${APP_NAME}-api.service"
sudo tee "$SERVICE_FILE" >/dev/null <<EOF
[Unit]
Description=Courier of Hearts API
After=network.target

[Service]
Type=simple
WorkingDirectory=${PUBLIC_ROOT}
Environment=NODE_ENV=production
EnvironmentFile=/etc/${APP_NAME}/.env
ExecStart=/usr/bin/node ${PUBLIC_ROOT}/server/index.js
Restart=always
RestartSec=3
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
EOF

BACKUP_SERVICE_FILE="/etc/systemd/system/${APP_NAME}-backup.service"
sudo tee "$BACKUP_SERVICE_FILE" >/dev/null <<EOF
[Unit]
Description=Courier of Hearts DB Backup
After=network.target

[Service]
Type=oneshot
Environment=APP_NAME=${APP_NAME}
Environment=DB_FILE=${PUBLIC_ROOT}/data/letters.db
Environment=BACKUP_DIR=/var/backups/${APP_NAME}
ExecStart=/bin/bash ${PUBLIC_ROOT}/scripts/backup-db.sh
EOF

BACKUP_TIMER_FILE="/etc/systemd/system/${APP_NAME}-backup.timer"
sudo tee "$BACKUP_TIMER_FILE" >/dev/null <<EOF
[Unit]
Description=Run Courier of Hearts backup daily

[Timer]
OnCalendar=daily
Persistent=true
Unit=${APP_NAME}-backup.service

[Install]
WantedBy=timers.target
EOF

NGINX_FILE="/etc/nginx/sites-available/${APP_NAME}.conf"
sudo tee "$NGINX_FILE" >/dev/null <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    return 444;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${SERVER_NAMES};
    server_tokens off;
    client_max_body_size 256k;

    root ${APP_ROOT};
    index index.html;

    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy no-referrer always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    location /api/ {
        proxy_pass http://${API_HOST}:${API_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

sudo ln -sf "$NGINX_FILE" "/etc/nginx/sites-enabled/${APP_NAME}.conf"
if [[ "$ENABLE_UFW" == "true" ]] && command -v ufw >/dev/null 2>&1; then
  echo "==> Applying UFW baseline"
  sudo ufw allow OpenSSH || true
  sudo ufw allow 80/tcp || true
  sudo ufw allow 443/tcp || true
  sudo ufw --force enable || true
fi

sudo nginx -t
sudo systemctl daemon-reload
sudo systemctl enable --now "${APP_NAME}-api.service"
sudo systemctl enable --now "${APP_NAME}-backup.timer"
sudo systemctl restart "${APP_NAME}-api.service"
sudo systemctl reload nginx

if [[ -n "$CERTBOT_EMAIL" ]] && command -v certbot >/dev/null 2>&1; then
  echo "==> Requesting TLS certificate via certbot"
  sudo certbot --nginx "${CERTBOT_DOMAINS[@]}" --non-interactive --agree-tos -m "$CERTBOT_EMAIL" --redirect || true
fi

echo
printf '%s
' "Deployment complete."
printf '%s
' "Frontend: https://${DOMAIN}"
printf '%s
' "Server names: ${SERVER_NAMES}"
printf '%s
' "Internal API: ${API_HOST}:${API_PORT} (proxied only through Nginx)"
printf '%s
' "Legacy JSON path: ${PUBLIC_ROOT}/server/data/letters.json"
printf '%s
' "MySQL/MariaDB mirror enabled: $([[ -n "${MYSQL_MIRROR_URL}" ]] && echo yes || echo no)"
printf '%s
' "Admin panel enabled: ${VITE_ENABLE_ADMIN_PANEL}"
printf '%s
' "Admin route: /#/${VITE_ADMIN_ROUTE}"
printf '%s
' "Saved deploy answers to: ${DEPLOY_ENV_FILE}"
printf '%s
' "Server stats: npm run server:stats"
printf '%s
' "Admin letter dump: npm run letters:admin -- --full"
printf '%s
' "Backups: systemctl status ${APP_NAME}-backup.timer"
