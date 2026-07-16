#!/usr/bin/env bash
set -euo pipefail

# Permission fix script for Courier of Hearts
# Run this after deploy or if you encounter permission issues

APP_NAME="courier-of-hearts"
PUBLIC_ROOT="${PUBLIC_ROOT:-/var/lib/${APP_NAME}}"
APP_ROOT="${APP_ROOT:-/var/www/${APP_NAME}}"
LOCAL_USER="${SUDO_USER:-$(id -un)}"

echo "==> Fixing permissions for Courier of Hearts..."

# Ensure directories exist
sudo mkdir -p "$APP_ROOT" "$PUBLIC_ROOT" "$PUBLIC_ROOT/data" "$PUBLIC_ROOT/cache" "$PUBLIC_ROOT/server/data" "/var/backups/${APP_NAME}"

# Fix ownership for frontend (served by nginx)
echo "==> Setting frontend ownership (nginx reads these)"
sudo chown -R www-data:www-data "$APP_ROOT"
sudo chmod -R 755 "$APP_ROOT"

# Fix ownership for backend (run by www-data user)
echo "==> Setting backend ownership (www-data runs the API)"
sudo chown -R www-data:www-data "$PUBLIC_ROOT"
sudo chmod 755 "$PUBLIC_ROOT"
sudo chmod 755 "$PUBLIC_ROOT/server" 2>/dev/null || true

# Data directories need write access for SQLite
echo "==> Setting data directory permissions (SQLite needs write)"
sudo chmod 775 "$PUBLIC_ROOT/data" "$PUBLIC_ROOT/cache" "$PUBLIC_ROOT/server/data" 2>/dev/null || true
sudo chown -R www-data:www-data "$PUBLIC_ROOT/data" "$PUBLIC_ROOT/cache" "$PUBLIC_ROOT/server/data" 2>/dev/null || true

# Database file needs write access
if [[ -f "$PUBLIC_ROOT/data/letters.db" ]]; then
  sudo chown www-data:www-data "$PUBLIC_ROOT/data/letters.db"
  sudo chmod 664 "$PUBLIC_ROOT/data/letters.db"
  echo "    Fixed permissions for letters.db"
fi

# Legacy JSON if exists
if [[ -f "$PUBLIC_ROOT/server/data/letters.json" ]]; then
  sudo chown www-data:www-data "$PUBLIC_ROOT/server/data/letters.json"
  sudo chmod 640 "$PUBLIC_ROOT/server/data/letters.json"
  echo "    Fixed permissions for letters.json"
fi

# Backup directory
sudo chmod 755 "/var/backups/${APP_NAME}"
sudo chown -R www-data:www-data "/var/backups/${APP_NAME}" 2>/dev/null || true

# Config directory
sudo mkdir -p "/etc/${APP_NAME}"
sudo chmod 750 "/etc/${APP_NAME}"
sudo chown root:www-data "/etc/${APP_NAME}" 2>/dev/null || true

if [[ -f "/etc/${APP_NAME}/.env" ]]; then
  sudo chmod 640 "/etc/${APP_NAME}/.env"
  sudo chown root:www-data "/etc/${APP_NAME}/.env" 2>/dev/null || true
  echo "    Fixed permissions for /etc/${APP_NAME}/.env"
fi

# Ensure local user can still read/write for development
sudo usermod -a -G www-data "$LOCAL_USER" 2>/dev/null || true

echo "==> Permission fix complete."
echo "    Frontend (${APP_ROOT}): owned by www-data:www-data, 755"
echo "    Backend (${PUBLIC_ROOT}): owned by www-data:www-data, 755"
echo "    Data dirs: 775, owned by www-data:www-data"
echo "    Database: 664, owned by www-data:www-data"
echo "    Config: 640, owned by root:www-data"
echo ""
echo "NOTE: If you're developing locally, you may need to log out and back in"
echo "for the www-data group membership to take effect."