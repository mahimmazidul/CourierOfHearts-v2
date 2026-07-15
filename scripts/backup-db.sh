#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-courier-of-hearts}"
DB_FILE="${DB_FILE:-/var/lib/${APP_NAME}/data/letters.db}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/${APP_NAME}}"
TIMESTAMP="$(date +%F-%H%M%S)"

mkdir -p "$BACKUP_DIR"
if [[ -f "$DB_FILE" ]]; then
  cp "$DB_FILE" "$BACKUP_DIR/letters-${TIMESTAMP}.db"
  find "$BACKUP_DIR" -type f -name 'letters-*.db' -mtime +14 -delete
  echo "Backup written to $BACKUP_DIR/letters-${TIMESTAMP}.db"
else
  echo "Database not found: $DB_FILE"
fi
