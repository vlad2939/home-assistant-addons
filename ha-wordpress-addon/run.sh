#!/usr/bin/env bash

# Extragem configurațiile făcute în GUI-ul Addon-ului folosind `jq`
echo "=== Preluare parametri Home Assistant (/data/options.json) ==="
DB_HOST=$(jq --raw-output '.db_host' /data/options.json)
DB_USER=$(jq --raw-output '.db_user' /data/options.json)
DB_PASSWORD=$(jq --raw-output '.db_password' /data/options.json)
DB_NAME=$(jq --raw-output '.db_name' /data/options.json)

WP_DIR="/share/wordpress"

echo "=== Verificare /share/wordpress ==="
# Cream folderul dacă nu a mai fost rulat serverul vreodată 
if [ ! -d "${WP_DIR}" ]; then
    echo "Folderul /share/wordpress nu există. Se creează..."
    mkdir -p "${WP_DIR}"
fi

# Verificăm dacă sunt prezente deja fișierele de WordPress
if [ ! -f "${WP_DIR}/wp-includes/version.php" ]; then
    echo "Fisierele de instalare WordPress nu au fost găsite."
    echo "Se descarcă ultima versiune de la wordpress.org..."
    wget -q https://wordpress.org/latest.tar.gz -O /tmp/wordpress.tar.gz
    
    if [ -f /tmp/wordpress.tar.gz ]; then
        tar -xzf /tmp/wordpress.tar.gz -C /tmp/
        cp -a /tmp/wordpress/. "${WP_DIR}/"
        rm -rf /tmp/wordpress /tmp/wordpress.tar.gz
        echo "Fișierele au fost copiate cu succes în ${WP_DIR}!"
    else
        echo "EROARE la descărcarea arhivei. Verifică conexiunea la internet."
    fi
else
    echo "Instalarea WordPress a fost detectată în ${WP_DIR}. Păstrăm fișierele existente."
fi

# Fixăm permisiunile pentru a lăsa Nginx să comunice cu fișierele noastre
echo "=== Setare permisiuni directoare (nginx:nginx) ==="
chown -R nginx:nginx "${WP_DIR}"
find "${WP_DIR}" -type d -exec chmod 755 {} \;
find "${WP_DIR}" -type f -exec chmod 644 {} \;

echo "=== Injectament Automatat wp-config.php ==="
if [ ! -f "${WP_DIR}/wp-config.php" ] && [ -f "${WP_DIR}/wp-config-sample.php" ]; then
    echo "Se generează /share/wordpress/wp-config.php..."
    cp "${WP_DIR}/wp-config-sample.php" "${WP_DIR}/wp-config.php"
    sed -i "s/database_name_here/${DB_NAME}/g" "${WP_DIR}/wp-config.php"
    sed -i "s/username_here/${DB_USER}/g" "${WP_DIR}/wp-config.php"
    sed -i "s/password_here/${DB_PASSWORD}/g" "${WP_DIR}/wp-config.php"
    sed -i "s/localhost/${DB_HOST}/g" "${WP_DIR}/wp-config.php"
    
    # Asigură-te că si cel creat automat are permisiuni nginx
    chown nginx:nginx "${WP_DIR}/wp-config.php"
fi

echo "=== Configurare backend PHP-FPM ==="
# Schimbam pool-ul www.conf pentru ca procesele PHP să ruleze pe nginx, direct pe port 9000
sed -i 's/user = nobody/user = nginx/g' /etc/php82/php-fpm.d/www.conf
sed -i 's/group = nobody/group = nginx/g' /etc/php82/php-fpm.d/www.conf
# Ridicem memoria PHP la 256MB și limită upload în concordanță cu Nginx
sed -i 's/memory_limit = 128M/memory_limit = 256M/g' /etc/php82/php.ini
sed -i 's/upload_max_filesize = 2M/upload_max_filesize = 256M/g' /etc/php82/php.ini
sed -i 's/post_max_size = 8M/post_max_size = 256M/g' /etc/php82/php.ini

echo "=== Pornire Procese (PHP și Web Server) ==="
# Pornim PHP-FPM în background
php-fpm82 -D
# Pornim procesul Nginx ca foreground (daemon off)
exec nginx -g "daemon off;"
