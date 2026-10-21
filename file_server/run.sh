#!/usr/bin/with-contenv bashio
set -e

mkdir -p /share/file_server
bashio::log.info "File Server pornește pe portul 8085"
bashio::log.info "Director pentru fișiere: /share/file_server"

exec node /app/server.js
