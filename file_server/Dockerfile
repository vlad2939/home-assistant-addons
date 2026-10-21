ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:latest
FROM ${BUILD_FROM}

RUN apk add --no-cache nodejs zip

WORKDIR /app
COPY server.js ./server.js
COPY logo.png ./logo.png
COPY public ./public
COPY run.sh /run.sh
RUN chmod a+x /run.sh

EXPOSE 8085
CMD ["/run.sh"]
