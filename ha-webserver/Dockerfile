ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:latest
FROM $BUILD_FROM

# Setăm label-uri pentru add-on
LABEL io.hass.version="1.0.0" io.hass.type="addon"

# Actualizăm pachetele și instalăm NGINX + bashio pentru HA
RUN apk add --no-cache \
    nginx \
    bash \
    jq

# Copiem fișierele de configurare locale
COPY nginx.conf /etc/nginx/nginx.conf
COPY run.sh /run.sh

# Setăm permisiunile de execuție pentru scriptul de start
RUN chmod a+x /run.sh

# Comanda principală care va fi rulată
CMD [ "/run.sh" ]
