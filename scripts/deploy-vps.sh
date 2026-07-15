#!/usr/bin/env bash
set -euo pipefail

APP_NAME="courier-of-hearts"
APP_ROOT="${APP_ROOT:-/var/www/${APP_NAME}}"
DOMAIN="${DOMAIN:-example.com}"
API_PORT="${API_PORT:-3847}"
API_HOST="${API_HOST:-127.0.0.1}"
BUILD_API_BASE_URL="${BUILD_API_BASE_URL:-/api/v1}"
SYSTEMD_DIR="${SYSTEMD_DIR:-/etc/systemd/system}"
NGINX_SITES_AVAILABLE="${NGINX_SITES_AVAILABLE:-/etc/nginx/sites-available}"
NGINX_SITES_ENABLED="${NGINX_SITES_ENABLED:-/etc/nginx/sites-enabled}"

if [[ "${DOMAIN}" == "example.com" ]]; then
  echo "Set DOMAIN before running, e.g. DOMAIN=letters.example.com npm run deploy:vps"
  exit 1
fi

npm ci
VITE_API_BASE_URL="${BUILD_API_BASE_URL}" npm run build

sudo mkdir -p "${APP_ROOT}" /var/lib/${APP_NAME} /etc/${APP_NAME}
sudo rsync -a --delete dist/ "${APP_ROOT}/"
sudo rsync -a server/ "/var/lib/${APP_NAME}/server/"
sudo rsync -a package.json package-lock.json "${PWD}/node_modules" "/var/lib/${APP_NAME}/"

sudo install -m 640 .env.example "/etc/${APP_NAME}/.env"

SERVICE_FILE="${SYSTEMD_DIR}/${APP_NAME}-api.service"
sudo tee "${SERVICE_FILE}" >/dev/null <<SERVICE
[Unit]
Description=Courier of Hearts API
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/lib/${APP_NAME}
Environment=NODE_ENV=production
Environment=HOST=${API_HOST}
Environment=PORT=${API_PORT}
Environment=DB_FILE=/var/lib/${APP_NAME}/data/letters.db
Environment=CACHE_DIR=/var/lib/${APP_NAME}/cache
Environment=CORS_ORIGIN=https://${DOMAIN}
EnvironmentFile=/etc/${APP_NAME}/.env
ExecStart=/usr/bin/node /var/lib/${APP_NAME}/server/index.js
Restart=always
RestartSec=3
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
SERVICE

NGINX_FILE="${NGINX_SITES_AVAILABLE}/${APP_NAME}.conf"
sudo tee "${NGINX_FILE}" >/dev/null <<NGINX
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    return 444;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    root ${APP_ROOT};
    index index.html;

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
NGINX

sudo ln -sf "${NGINX_FILE}" "${NGINX_SITES_ENABLED}/${APP_NAME}.conf"
sudo nginx -t
sudo systemctl daemon-reload
sudo systemctl enable --now "${APP_NAME}-api.service"
sudo systemctl restart "${APP_NAME}-api.service"
sudo systemctl reload nginx

echo "Deployed."
echo "Frontend served only from domain: https://${DOMAIN}"
echo "API bound locally at ${API_HOST}:${API_PORT} and exposed through Nginx only."
echo "Tip: add TLS with certbot or your preferred ACME setup next."
