#!/usr/bin/env bashio

echo "Initializare Full Web Server Add-on..."

# Calea către directorul din share
TARGET_DIR="/share/webserver"

# Verificăm dacă directorul există, dacă nu, îl creăm automagiat
if [ ! -d "$TARGET_DIR" ]; then
    echo "Directorul $TARGET_DIR nu există. Îl creez acum..."
    mkdir -p "$TARGET_DIR"
    
    # Adăugăm un fișier html demonstrativ
    echo "<!DOCTYPE html>
<html>
<head>
    <title>Server Web Funcțional - HA Add-on</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; background-color: #f4f4f9; color: #333; }
        h1 { color: #03a9f4; }
        div.container { background: white; padding: 30px; border-radius: 10px; display: inline-block; box-shadow: 0px 4px 6px rgba(0,0,0,0.1); }
    </style>
</head>
<body>
    <div class='container'>
        <h1>✅ Server Web NGINX Funcțional!</h1>
        <p>Acest server este găzduit pe Intel NUC-ul tău prin Home Assistant.</p>
        <p>Pune fișierele tale în folderul <strong>/share/webserver/</strong> folosind Samba, File Editor sau Studio Code Server.</p>
    </div>
</body>
</html>" > "$TARGET_DIR/index.html"
    echo "S-a creat un fisier index.html demonstrativ."
else
    echo "Directorul $TARGET_DIR există deja."
fi

echo "Verificare permisiuni director..."
chmod -R 755 "$TARGET_DIR"

echo "Pornire server NGINX..."
# Pornim nginx fără daemon ca să râmână containerul activ
exec nginx -g "daemon off;"
