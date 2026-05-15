FROM alpine:3.19

# Setează variabilă de mediu pentru limba corectă 
ENV LANG C.UTF-8

# Instalează Nginx, utilitare și pachetele pentru PHP 8.2 + MariaDB Client
RUN apk add --no-cache \
    bash \
    nginx \
    jq \
    curl \
    wget \
    unzip \
    mariadb-client \
    php82 \
    php82-fpm \
    php82-mysqli \
    php82-json \
    php82-openssl \
    php82-curl \
    php82-zlib \
    php82-xml \
    php82-phar \
    php82-intl \
    php82-dom \
    php82-xmlreader \
    php82-ctype \
    php82-session \
    php82-mbstring \
    php82-gd \
    php82-iconv \
    php82-pecl-imagick \
    php82-zip

# Copiază configurația Nginx customizată în folderul nginx
COPY nginx.conf /etc/nginx/http.d/default.conf

# Copiază și permite execuția scriptului de rulare (entrypoint)
COPY run.sh /run.sh
RUN chmod a+x /run.sh

# Rulează scriptul de asamblare și start
CMD [ "/run.sh" ]
