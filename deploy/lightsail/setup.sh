#!/usr/bin/env bash
# One-time setup of a fresh Lightsail Ubuntu 24.04 instance for NinRe.
# Clone the repo to /opt/ninre first, then run as the default ubuntu user:
#   bash /opt/ninre/deploy/lightsail/setup.sh ninre.app
set -euo pipefail

DOMAIN=${1:?usage: setup.sh <domain>}
APP_DIR=/opt/ninre
DATA_DIR=/var/lib/ninre
[ "$(cd "$(dirname "$0")/../.." && pwd)" = "$APP_DIR" ] || { echo "Clone the repo to $APP_DIR first." >&2; exit 1; }

# Node 24, Caddy, sqlite3 and automatic security updates
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg sqlite3 unattended-upgrades debian-keyring debian-archive-keyring apt-transport-https
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs
curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | sudo gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
sudo apt-get update
sudo apt-get install -y caddy

# The service runs as its own user and can write only to the data folder
id ninre >/dev/null 2>&1 || sudo useradd --system --home "$DATA_DIR" --shell /usr/sbin/nologin ninre
sudo install -d -o ninre -g ninre -m 750 "$DATA_DIR" /var/backups/ninre

cd "$APP_DIR"
npm ci --no-audit --no-fund
npm run build

# Settings, from .env.example; an existing file is kept
if [ ! -f /etc/ninre/ninre.env ]; then
  sudo install -d -m 755 /etc/ninre
  sed -e "s#^DATA_DIR=.*#DATA_DIR=$DATA_DIR#" -e "s#^APP_URL=.*#APP_URL=https://$DOMAIN#" .env.example | sudo tee /etc/ninre/ninre.env >/dev/null
  sudo chown root:ninre /etc/ninre/ninre.env
  sudo chmod 640 /etc/ninre/ninre.env
fi

sudo cp deploy/lightsail/ninre.service /etc/systemd/system/ninre.service
sed "s#example.com#$DOMAIN#" deploy/lightsail/Caddyfile | sudo tee /etc/caddy/Caddyfile >/dev/null
echo "30 3 * * * ninre $APP_DIR/deploy/lightsail/backup.sh" | sudo tee /etc/cron.d/ninre-backup >/dev/null

sudo systemctl daemon-reload
sudo systemctl enable --now ninre
sudo systemctl reload caddy

echo "NinRe is running. Caddy fetches the HTTPS certificate once $DOMAIN points at this server."
echo "Add the PayMongo keys to /etc/ninre/ninre.env, then run: sudo systemctl restart ninre"
