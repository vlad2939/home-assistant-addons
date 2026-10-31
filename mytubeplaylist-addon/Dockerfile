FROM nginx:alpine

RUN apk add --no-cache python3 && rm -rf /usr/share/nginx/html/*

COPY index.html style.css app.js data.json builder.html README.md /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY server.py run.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/run.sh

EXPOSE 3000
CMD ["/usr/local/bin/run.sh"]