#!/usr/bin/env bash
# Pulls main, rebuilds and restarts. Run on the server as the ubuntu user.
set -euo pipefail

cd /opt/ninre
git pull --ff-only origin main
npm ci --no-audit --no-fund
npm run build
sudo systemctl restart ninre
echo "Deployed $(git rev-parse --short HEAD)."
