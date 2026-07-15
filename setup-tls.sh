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

ensure_command() {
  local cmd="$1"
  local pkg="$2"
  if command -v "$cmd" >/dev/null 2>&1; then
    return
  fi
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y "$pkg"
    return
  fi
  echo "Missing required command ${cmd}. Install ${pkg} first."
  exit 1
}

load_env_file "$REPO_ROOT/.env"
load_env_file "$DEPLOY_ENV_FILE"

DOMAIN="${DOMAIN:-letters.example.com}"
ADDITIONAL_DOMAINS="${ADDITIONAL_DOMAINS:-}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"

ensure_command nginx nginx
if ! command -v certbot >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y certbot python3-certbot-nginx
  else
    echo "certbot is required. Install certbot and python3-certbot-nginx first."
    exit 1
  fi
fi

CERTBOT_DOMAINS=("-d" "$DOMAIN")
if [[ -n "$ADDITIONAL_DOMAINS" ]]; then
  IFS=',' read -r -a EXTRA_DOMAIN_ARRAY <<< "$ADDITIONAL_DOMAINS"
  for raw_domain in "${EXTRA_DOMAIN_ARRAY[@]}"; do
    domain_trimmed="$(echo "$raw_domain" | xargs)"
    [[ -z "$domain_trimmed" ]] && continue
    CERTBOT_DOMAINS+=("-d" "$domain_trimmed")
  done
fi

sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl restart nginx

echo "==> Requesting TLS certificates for: ${CERTBOT_DOMAINS[*]}"
if [[ -n "$CERTBOT_EMAIL" ]]; then
  sudo certbot --nginx "${CERTBOT_DOMAINS[@]}" --non-interactive --agree-tos -m "$CERTBOT_EMAIL" --redirect
else
  sudo certbot --nginx "${CERTBOT_DOMAINS[@]}" --non-interactive --agree-tos --register-unsafely-without-email --redirect
fi

echo "==> TLS setup complete"
echo "Primary domain: https://${DOMAIN}"
