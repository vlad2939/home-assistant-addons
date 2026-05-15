# Vlad Home Assistant Add-ons

O colectie personala de add-on-uri pentru Home Assistant, grupate intr-un singur repository. Fiecare add-on ramane independent, cu propriul `config.yaml`, `Dockerfile`, cod sursa, fisiere de configurare si ciclu de versiune.

Repository URL:

```text
https://github.com/vlad2939/home-assistant-addons
```

## Despre Acest Repository

Acest repository este gandit ca un monorepo pentru add-on-uri Home Assistant. In loc sa adaugi cate un repository separat pentru fiecare proiect, adaugi o singura adresa in Home Assistant, iar Add-on Store va detecta toate add-on-urile disponibile.

Avantaje:

- un singur repository de adaugat in Home Assistant;
- fiecare add-on ramane separat si poate fi instalat individual;
- fiecare add-on are propriul `slug`, propria versiune si propriile fisiere;
- poti adauga usor add-on-uri noi prin crearea unui folder nou la radacina;
- proiectele existente raman usor de intretinut, fara sa fie transformate intr-o singura aplicatie.

## Instalare

1. Deschide Home Assistant.
2. Mergi la **Settings** -> **Add-ons** -> **Add-on Store**.
3. Apasa meniul cu trei puncte din dreapta sus.
4. Alege **Repositories**.
5. Adauga urmatoarea adresa:

```text
https://github.com/vlad2939/home-assistant-addons
```

6. Apasa **Add**.
7. Revino in Add-on Store si cauta add-on-ul dorit.
8. Instaleaza add-on-ul, apoi porneste-l din pagina lui.

## Lista Add-on-urilor

| Add-on | Folder | Slug | Versiune | Ingress | Port intern | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Car Cost Dashboard | `car-cost-dashboard` | `car_cost_dashboard` | `1.4.4` | Da | `3000` | Stabil |
| Home Cost Dashboard | `home-cost-dashboard` | `homecost` | `1.4.1` | Da | `3000` | Stabil |
| TubeDash | `tubedash-addon` | `tubedash` | `5.0.2` | Da | `3000` | Stabil |
| Full Web Server | `ha-webserver` | `full_web_server` | `1.0.4` | Da | `80` | Stabil |
| WordPress Full Option | `ha-wordpress-addon` | `wordpress_full` | `1.0.2` | Nu | `80` | Stabil |
| MyTube Playlist | `mytubeplaylist-addon` | `mytubeplaylist` | `2.0.0` | Da | `3000` | Stabil |
| YT Downloader | `yt-downloader-addon` | `yt_downloader` | `4.0.0` | Da | `3000` | Stabil |
| MyTube Dash | `mytubedash-addon` | `mytubedash` | `2.0.5` | Da | `3000` | Stabil |

Legenda:

- **Ingress**: add-on-ul poate fi deschis direct din interfata Home Assistant.
- **Port intern**: portul pe care aplicatia asculta in container.
- **Slug**: identificatorul unic folosit de Home Assistant. Doua add-on-uri nu trebuie sa aiba acelasi slug.

## Add-on-uri Incluse

### Car Cost Dashboard

Dashboard local pentru evidenta costurilor auto. Ruleaza ca aplicatie Node.js simpla si ofera o interfata web pentru cheltuieli, alimentari, backup si restaurare date.

Detalii:

- folder: `car-cost-dashboard`;
- slug: `car_cost_dashboard`;
- versiune: `1.4.4`;
- ingress: activ;
- port intern: `3000`;
- port extern implicit: `3030`;
- date persistente: `/data/car-cost-dashboard`;
- fisiere principale: `server.js`, `public/`, `data/`, `run.sh`.

### Home Cost Dashboard

Dashboard pentru urmarirea si analiza cheltuielilor casei si utilitatilor. Aplicatia ruleaza prin Node.js si foloseste o baza de date JSON locala.

Detalii:

- folder: `home-cost-dashboard`;
- slug: `homecost`;
- versiune: `1.4.1`;
- ingress: activ;
- port intern: `3000`;
- port extern implicit: `3040`;
- date aplicatie: `app/database.json`;
- fisiere principale: `app/`, `rootfs/`, `Dockerfile`.

### TubeDash

Aplicatie HTML/CSS/JavaScript servita prin NGINX, destinata organizarii si vizualizarii continutului YouTube intr-un mediu controlat.

Detalii:

- folder: `tubedash-addon`;
- slug: `tubedash`;
- versiune: `5.0.2`;
- ingress: activ;
- port intern: `3000`;
- fisiere principale: `index.html`, `style.css`, `app.js`, `data.json`.

Nota: acest add-on a primit slug-ul `tubedash` pentru a evita conflictul cu `mytubedash-addon`.

### Full Web Server

Server NGINX complet pentru Home Assistant. Serveste fisiere din `/share/webserver`, cu suport pentru autoindexare si acces direct prin port mapat.

Detalii:

- folder: `ha-webserver`;
- slug: `full_web_server`;
- versiune: `1.0.4`;
- ingress: activ;
- port intern: `80`;
- port extern implicit: `8080`;
- folder servit: `/share/webserver`;
- fisiere principale: `nginx.conf`, `run.sh`, `Dockerfile`.

### WordPress Full Option

Add-on pentru WordPress cu NGINX, PHP 8.2 si conectare la MariaDB. Fisierele WordPress sunt pastrate in `/share/wordpress`.

Detalii:

- folder: `ha-wordpress-addon`;
- slug: `wordpress_full`;
- versiune: `1.0.2`;
- port intern: `80`;
- port extern implicit: `8090`;
- folder WordPress: `/share/wordpress`;
- necesita baza de date MariaDB configurata separat;
- fisiere principale: `nginx.conf`, `run.sh`, `Dockerfile`.

Configurare implicita:

```yaml
db_host: "core-mariadb"
db_user: "wordpress"
db_password: "Trece_aici_parola_setata_in_MariaDB"
db_name: "wordpress"
```

### MyTube Playlist

Aplicatie statica pentru playlist-uri YouTube, cu viewer si editor. Este servita prin NGINX si functioneaza prin Ingress.

Detalii:

- folder: `mytubeplaylist-addon`;
- slug: `mytubeplaylist`;
- versiune: `2.0.0`;
- ingress: activ;
- port intern: `3000`;
- fisiere principale: `index.html`, `style.css`, `app.js`, `data.json`, `builder.html`.

### YT Downloader

Aplicatie web pentru descarcarea videoclipurilor de pe YouTube. Ruleaza ca aplicatie Node.js si foloseste `yt-dlp`/procese auxiliare pentru descarcare.

Detalii:

- folder: `yt-downloader-addon`;
- slug: `yt_downloader`;
- versiune: `4.0.0`;
- ingress: activ;
- port intern: `3000`;
- port extern implicit: `3000`;
- fisiere principale: `src/`, `public/`, `package.json`, `Dockerfile`.

### MyTube Dash

Aplicatie HTML/CSS/JavaScript servita prin NGINX pentru dashboard YouTube. Ramane separata de `TubeDash` si pastreaza slug-ul original `mytubedash`.

Detalii:

- folder: `mytubedash-addon`;
- slug: `mytubedash`;
- versiune: `2.0.5`;
- ingress: activ;
- port intern: `3000`;
- fisiere principale: `index.html`, `style.css`, `app.js`.

## Structura Repository-ului

```text
home-assistant-addons/
  repository.yaml
  README.md
  .gitignore

  car-cost-dashboard/
    config.yaml
    Dockerfile
    ...

  home-cost-dashboard/
    config.yaml
    Dockerfile
    ...

  tubedash-addon/
    config.yaml
    Dockerfile
    ...

  ha-webserver/
    config.yaml
    Dockerfile
    ...

  ha-wordpress-addon/
    config.yaml
    Dockerfile
    ...

  mytubeplaylist-addon/
    config.yaml
    Dockerfile
    ...

  yt-downloader-addon/
    config.yaml
    Dockerfile
    ...

  mytubedash-addon/
    config.yaml
    Dockerfile
    ...
```

Home Assistant citeste folderele de la radacina repository-ului. Orice folder care contine un `config.yaml` valid este tratat ca add-on separat.

## Cum Adaugi Un Add-on Nou

1. Creeaza un folder nou la radacina repository-ului.
2. Alege un nume scurt si clar pentru folder, de exemplu:

```text
my-new-addon/
```

3. Adauga cel putin aceste fisiere:

```text
my-new-addon/
  config.yaml
  Dockerfile
  README.md
```

4. In `config.yaml`, foloseste un `slug` unic:

```yaml
name: "My New Add-on"
version: "1.0.0"
slug: "my_new_addon"
description: "Descriere scurta a add-on-ului."
url: "https://github.com/vlad2939/home-assistant-addons"
arch:
  - amd64
  - aarch64
startup: application
boot: auto
init: false
```

5. Daca add-on-ul are interfata web in Home Assistant, adauga Ingress:

```yaml
ingress: true
ingress_port: 3000
panel_icon: mdi:application
panel_title: "My New Add-on"
```

6. Daca vrei acces direct din retea, adauga si port mapat:

```yaml
ports:
  3000/tcp: 3000
ports_description:
  3000/tcp: "Interfata web"
webui: "http://[HOST]:[PORT:3000]"
```

## Reguli De Mentenanta

- Fiecare add-on isi pastreaza propria versiune in `config.yaml`.
- Cand modifici un add-on, creste versiunea doar pentru acel add-on.
- Nu folosi acelasi `slug` in doua add-on-uri diferite.
- Pastreaza `url` in fiecare `config.yaml` catre repository-ul principal:

```text
https://github.com/vlad2939/home-assistant-addons
```

- Pastreaza datele utilizatorului in `/data` sau `/share`, nu in fisiere care se pierd la rebuild.
- Pentru add-on-uri cu fisiere persistente, documenteaza clar folderul folosit.
- Pentru aplicatii web, prefera Ingress daca vrei acces direct din meniul lateral Home Assistant.

## Actualizare Add-on-uri

Pentru a publica o versiune noua:

1. Modifica fisierele add-on-ului.
2. Creste `version` in `config.yaml`.
3. Actualizeaza `README.md`, `DOCS.md` sau `CHANGELOG.md` daca exista.
4. Publica modificarile in GitHub.
5. In Home Assistant, intra in Add-on Store si verifica daca apare actualizarea.

Uneori Home Assistant poate tine cache pentru lista de add-on-uri. Daca nu apare imediat:

- reporneste Home Assistant;
- reincarca Add-on Store;
- elimina si adauga din nou repository-ul;
- verifica daca `config.yaml` este valid YAML.

## Testare Recomandata

Dupa o modificare importanta, testeaza cel putin:

- add-on-ul apare in Add-on Store;
- instalarea porneste fara eroare;
- containerul porneste fara crash;
- Ingress se deschide corect, unde este activ;
- portul extern functioneaza, unde este definit;
- datele persistente raman dupa restart/rebuild;
- logurile nu contin erori critice.

Pentru acest repository, testarea manuala principala ar trebui sa acopere:

- `ha-webserver` cu fisiere in `/share/webserver`;
- `ha-wordpress-addon` cu MariaDB configurat;
- `car-cost-dashboard` cu date persistente in `/data/car-cost-dashboard`;
- `home-cost-dashboard` cu baza `database.json`;
- `yt-downloader-addon` cu descarcare reala de test.

## Note Importante

- Acest repository contine add-on-uri personale, adaptate pentru uz local in Home Assistant.
- Unele add-on-uri pot necesita configurari suplimentare, cum ar fi MariaDB pentru WordPress.
- Unele add-on-uri expun porturi externe; verifica sa nu existe conflicte cu alte servicii din reteaua ta.
- Daca folosesti backup Home Assistant, include folderele `/share` si datele add-on-urilor pentru a pastra continutul important.

## Licenta

Fiecare add-on pastreaza fisierele de licenta existente in folderul sau, acolo unde acestea exista. Daca adaugi un add-on nou, include o licenta potrivita pentru proiectul respectiv.
