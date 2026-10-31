#!/bin/sh
set -eu
mkdir -p /data
if [ ! -f /data/data.json ]; then
    cp /usr/share/nginx/html/data.json /data/data.json
fi
python3 /usr/local/bin/server.py &
exec nginx -g 'daemon off;'