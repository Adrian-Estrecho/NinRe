#!/usr/bin/env bash
# Nightly copy of the database, kept for 14 days. Runs from cron as the ninre user.
# Photos are covered by the instance's automatic snapshots.
set -euo pipefail

DATA_DIR=${DATA_DIR:-/var/lib/ninre}
OUT=${BACKUP_DIR:-/var/backups/ninre}

sqlite3 "$DATA_DIR/ninre.sqlite" ".backup '$OUT/ninre-$(date +%F).sqlite'"
find "$OUT" -name 'ninre-*.sqlite' -mtime +14 -delete
