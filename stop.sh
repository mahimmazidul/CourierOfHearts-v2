#!/usr/bin/env bash
set -euo pipefail

APP_NAME="courier-of-hearts"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_ENV_FILE="${REPO_ROOT}/.deploy.env"

load_env_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    set -a
    source "$file"
    set +a
  fi
}

load_env_file "$REPO_ROOT/.env"
load_env_file "$DEPLOY_ENV_FILE"

PUBLIC_ROOT="${PUBLIC_ROOT:-/var/lib/${APP_NAME}}"
API_PORT="${API_PORT:-3847}"
DB_FILE="${DB_FILE:-${PUBLIC_ROOT}/data/letters.db}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/${APP_NAME}}"
NGINX_AVAILABLE="/etc/nginx/sites-available/${APP_NAME}.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/${APP_NAME}.conf"
TIMESTAMP="$(date +%F-%H%M%S)"

sudo mkdir -p "$BACKUP_DIR"

if sudo systemctl list-unit-files | grep -q "^${APP_NAME}-api.service"; then
  echo "==> Stopping ${APP_NAME}-api.service"
  sudo systemctl stop "${APP_NAME}-api.service" || true
fi

if sudo systemctl list-unit-files | grep -q "^${APP_NAME}-backup.timer"; then
  echo "==> Stopping ${APP_NAME}-backup.timer"
  sudo systemctl stop "${APP_NAME}-backup.timer" || true
fi

if sudo systemctl list-unit-files | grep -q "^${APP_NAME}-backup.service"; then
  echo "==> Stopping ${APP_NAME}-backup.service"
  sudo systemctl stop "${APP_NAME}-backup.service" || true
fi

if sudo test -f "$DB_FILE"; then
  echo "==> Checkpointing SQLite database"
  sudo python3 - <<PY
import sqlite3
path = ${DB_FILE@Q}
conn = sqlite3.connect(path)
conn.execute('PRAGMA wal_checkpoint(TRUNCATE);')
conn.close()
PY
  echo "==> Backing up SQLite database"
  sudo cp "$DB_FILE" "$BACKUP_DIR/letters-stop-${TIMESTAMP}.db"
fi

if sudo test -L "$NGINX_ENABLED"; then
  echo "==> Disabling nginx site symlink"
  sudo rm -f "$NGINX_ENABLED"
fi

if sudo test -f "$NGINX_AVAILABLE"; then
  echo "==> Reloading nginx"
  sudo nginx -t && sudo systemctl reload nginx || true
fi

LEFTOVER_PIDS="$(sudo ss -ltnp 2>/dev/null | awk -v port=":${API_PORT}" '$4 ~ port {print $NF}' | tr ',' '\n' | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | sort -u)"
if [[ -n "$LEFTOVER_PIDS" ]]; then
  echo "==> Stopping leftover listeners on port ${API_PORT}"
  for pid in $LEFTOVER_PIDS; do
    sudo kill "$pid" || true
  done
fi

if sudo ss -ltn 2>/dev/null | grep -q ":${API_PORT} "; then
  echo "==> Port ${API_PORT} is still busy"
  sudo ss -ltnp | grep ":${API_PORT}" || true
  exit 1
fi

echo
printf '%s
' "Stopped Courier of Hearts services."
printf '%s
' "SQLite database kept at: ${DB_FILE}"
printf '%s
' "Stop-time backup: ${BACKUP_DIR}/letters-stop-${TIMESTAMP}.db"
printf '%s
' "API port ${API_PORT} is now free."
