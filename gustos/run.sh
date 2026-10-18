#!/bin/sh
# Pornește serverul Gustos. Datele (gustos.db, photos/, backups/) stau în /data,
# folder păstrat la actualizări și inclus în backup-urile Home Assistant.
set -e

export GUSTOS_DATA_DIR="${GUSTOS_DATA_DIR:-/data}"
mkdir -p "$GUSTOS_DATA_DIR"

echo "Gustos pornește pe portul 8099 (date în $GUSTOS_DATA_DIR)"
cd /app/backend
exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8099 --no-access-log
