FROM node:20-slim

# Instalare python3 (necesar pentru unele procese de yt-dlp) ffmpeg si curl
RUN apt-get update && apt-get install -y python3 ffmpeg curl && rm -rf /var/lib/apt/lists/*

# Setare director de lucru
WORKDIR /app

# Copiere fisierele de pachete
COPY package*.json ./

# Instalare dependente
RUN npm install

# Copierea fișierelor proiectului
COPY . .

# Expunere port pentru WebUI-ul Home Assistant
EXPOSE 3000

# Pornirea aplicației (Folosim tsx care va fi gasit in node_modules)
CMD ["npm", "run", "start"]
