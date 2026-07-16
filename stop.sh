#!/usr/bin/env bash
set -euo pipefail

APP_NAME="courier-of-hearts"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_ENV_FILE="${REPO_ROOT}/.deploy.env"

load_env_file() {
  local file="$1"
  if [[ -r "$file" ]]; then
    set -a
    source "$file"
    set +a
  fi
}

load_env_file "$REPO_ROOT/.env"
load_env_file "$DEPLOY_ENV_FILE"
load_env_file "/etc/${APP_NAME}/.env"

PUBLIC_ROOT="${PUBLIC_ROOT:-/var/lib/${APP_NAME}}"
APP_ROOT="${APP_ROOT:-/var/www/${APP_NAME}}"
API_PORT="${API_PORT:-3847}"
DB_FILE="${DB_FILE:-${PUBLIC_ROOT}/data/letters.db}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/${APP_NAME}}"
NGINX_AVAILABLE="/etc/nginx/sites-available/${APP_NAME}.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/${APP_NAME}.conf"
TIMESTAMP="$(date +%F-%H%M%S)"

sudo mkdir -p "$BACKUP_DIR"

echo "==> Stopping Courier of Hearts services..."

# Stop systemd services
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

# Checkpoint and backup SQLite database (KEEP the database!)
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
  echo "    Database backed up to: $BACKUP_DIR/letters-stop-${TIMESTAMP}.db"
  echo "    *** DATABASE PRESERVED AT: $DB_FILE ***"
else
  echo "==> No database found at $DB_FILE (nothing to backup)"
fi

# Disable nginx site
if sudo test -L "$NGINX_ENABLED"; then
  echo "==> Disabling nginx site symlink"
  sudo rm -f "$NGINX_ENABLED"
fi

if sudo test -f "$NGINX_AVAILABLE"; then
  echo "==> Reloading nginx"
  sudo nginx -t && sudo systemctl reload nginx || true
fi

# Stop leftover listeners on API port - more aggressive approach
echo "==> Stopping leftover listeners on port ${API_PORT}"

# Try multiple methods to find and kill processes on the port
PIDS_FOUND=""

# Method 1: ss with pid extraction
PIDS_SS="$(sudo ss -ltnp 2>/dev/null | awk -v port=":${API_PORT}" '$4 ~ port {print $NF}' | tr ',' '\n' | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | sort -u)"
if [[ -n "$PIDS_SS" ]]; then
  PIDS_FOUND="$PIDS_SS"
fi

# Method 2: lsof (more reliable)
if command -v lsof >/dev/null 2>&1; then
  PIDS_LSOF="$(sudo lsof -ti:"${API_PORT}" 2>/dev/null | sort -u)"
  if [[ -n "$PIDS_LSOF" ]]; then
    PIDS_FOUND="$(echo -e "$PIDS_FOUND\n$PIDS_LSOF" | grep -v '^$' | sort -u)"
  fi
fi

# Method 3: fuser
if command -v fuser >/dev/null 2>&1; then
  PIDS_FUSER="$(sudo fuser "${API_PORT}/tcp" 2>/dev/null | tr ' ' '\n' | grep -E '^[0-9]+$' | sort -u)"
  if [[ -n "$PIDS_FUSER" ]]; then
    PIDS_FOUND="$(echo -e "$PIDS_FOUND\n$PIDS_FUSER" | grep -v '^$' | sort -u)"
  fi
fi

# Kill all found PIDs - first SIGTERM, then SIGKILL
if [[ -n "$PIDS_FOUND" ]]; then
  echo "    Found PIDs on port ${API_PORT}: $(echo $PIDS_FOUND | tr '\n' ' ')"
  for pid in $PIDS_FOUND; do
    echo "    Sending SIGTERM to PID $pid..."
    sudo kill "$pid" 2>/dev/null || true
  done
  sleep 1
  
  # Check if any still alive, then SIGKILL
  for pid in $PIDS_FOUND; do
    if sudo kill -0 "$pid" 2>/dev/null; then
      echo "    PID $pid still alive, sending SIGKILL..."
      sudo kill -9 "$pid" 2>/dev/null || true
    fi
  done
  sleep 1
else
  echo "    No processes found on port ${API_PORT}"
fi

# Final verification - wait up to 5 seconds for port to be free
MAX_WAIT=5
WAITED=0
while sudo ss -ltn 2>/dev/null | grep -q ":${API_PORT} "; do
  if [[ $WAITED -ge $MAX_WAIT ]]; then
    echo "==> Port ${API_PORT} is still busy after ${MAX_WAIT}s"
    sudo ss -ltnp | grep ":${API_PORT}" || true
    # Last resort: fuser -k
    if command -v fuser >/dev/null 2>&1; then
      echo "    Attempting fuser -k as last resort..."
      sudo fuser -k "${API_PORT}/tcp" 2>/dev/null || true
      sleep 1
    fi
    if sudo ss -ltn 2>/dev/null | grep -q ":${API_PORT} "; then
      exit 1
    fi
  fi
  sleep 1
  WAITED=$((WAITED + 1))
done

# =============================================================================
# CLEANUP: Remove built/dist/static files but PRESERVE database and backups
# =============================================================================
echo "==> Cleaning up build artifacts and static files..."

# Remove frontend build output (dist)
if [[ -d "$APP_ROOT" ]]; then
  echo "    Removing frontend build: $APP_ROOT"
  sudo rm -rf "$APP_ROOT"
fi

# Remove backend node_modules and build artifacts (but keep data/, cache/, scripts/)
if [[ -d "$PUBLIC_ROOT" ]]; then
  echo "    Cleaning backend directory: $PUBLIC_ROOT"
  # Remove node_modules
  sudo rm -rf "${PUBLIC_ROOT}/node_modules"
  # Remove package.json and package-lock.json (will be re-synced on deploy)
  sudo rm -f "${PUBLIC_ROOT}/package.json" "${PUBLIC_ROOT}/package-lock.json"
  # Remove server directory (will be re-synced on deploy)
  sudo rm -rf "${PUBLIC_ROOT}/server"
  # Remove scripts directory (will be re-synced on deploy)
  sudo rm -rf "${PUBLIC_ROOT}/scripts"
  # NOTE: We PRESERVE:
  #   - ${PUBLIC_ROOT}/data/ (database, legacy JSON)
  #   - ${PUBLIC_ROOT}/cache/ (daily caches)
  #   - ${PUBLIC_ROOT}/server/data/ (if exists separately)
fi

# Remove any local repo build artifacts
if [[ -d "$REPO_ROOT/dist" ]]; then
  echo "    Removing local repo dist: $REPO_ROOT/dist"
  rm -rf "$REPO_ROOT/dist"
fi

if [[ -d "$REPO_ROOT/node_modules" ]]; then
  echo "    Removing local repo node_modules: $REPO_ROOT/node_modules"
  rm -rf "$REPO_ROOT/node_modules"
fi

# Remove nginx config files (optional - comment out if you want to keep them)
if sudo test -f "$NGINX_AVAILABLE"; then
  echo "    Removing nginx config: $NGINX_AVAILABLE"
  sudo rm -f "$NGINX_AVAILABLE"
fi

# Remove systemd service files (optional - comment out if you want to keep them)
for svc in "${APP_NAME}-api.service" "${APP_NAME}-backup.service" "${APP_NAME}-backup.timer"; do
  SVC_FILE="/etc/systemd/system/${svc}"
  if sudo test -f "$SVC_FILE"; then
    echo "    Removing systemd service: $SVC_FILE"
    sudo rm -f "$SVC_FILE"
  fi
done

# Reload systemd after removing service files
sudo systemctl daemon-reload || true

echo
printf '%s\n' "Stopped Courier of Hearts services."
printf '%s\n' "========================================="
printf '%s\n' "PRESERVED (not deleted):"
printf '%s\n' "  - SQLite database: ${DB_FILE}"
printf '%s\n' "  - Database backup: ${BACKUP_DIR}/letters-stop-${TIMESTAMP}.db"
printf '%s\n' "  - Legacy JSON: ${PUBLIC_ROOT}/server/data/letters.json (if existed)"
printf '%s\n' "  - Cache directory: ${PUBLIC_ROOT}/cache/"
printf '%s\n' "========================================="
printf '%s\n' "REMOVED:"
printf '%s\n' "  - Frontend build: ${APP_ROOT}"
printf '%s\n' "  - Backend node_modules, server/, scripts/"
printf '%s\n' "  - Local repo dist/ and node_modules/"
printf '%s\n' "  - Nginx config and systemd service files"
printf '%s\n' "========================================="
printf '%s\n' "API port ${API_PORT} is now free."
printf '%s\n' "To redeploy, run: ./deploy.sh"