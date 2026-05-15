# Vlad`s Home Assistant Add-ons

O colecție personală de add-on-uri pentru Home Assistant, grupate într-un singur repository. Fiecare add-on rămâne independent, cu propriul `config.yaml`, `Dockerfile`, cod sursă, fișiere de configurare și ciclu de versiune.

Repository URL:

```text
https://github.com/vlad2939/home-assistant-addons
```

## Despre Acest Repository

Acest repository este gândit ca un monorepo pentru add-on-uri Home Assistant. În loc să adaugi câte un repository separat pentru fiecare proiect, adaugi o singură adresă în Home Assistant, iar Add-on Store va detecta toate add-on-urile disponibile.

Avantaje:

- un singur repository de adăugat în Home Assistant;
- fiecare add-on rămâne separat și poate fi instalat individual;
- fiecare add-on are propriul `slug`, propria versiune și propriile fișiere;
- poți adăuga ușor add-on-uri noi prin crearea unui folder nou la rădăcină;
- proiectele existente rămân ușor de întreținut, fără să fie transformate într-o singură aplicație.

## Instalare

1. Deschide Home Assistant.
2. Mergi la **Settings** -> **Add-ons** -> **Add-on Store**.
3. Apasă meniul cu trei puncte din dreapta sus.
4. Alege **Repositories**.
5. Adaugă următoarea adresă:

```text
https://github.com/vlad2939/home-assistant-addons
```

6. Apasă **Add**.
7. Revino în Add-on Store și caută add-on-ul dorit.
8. Instalează add-on-ul, apoi pornește-l din pagina lui.

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

Legendă:

- **Ingress**: add-on-ul poate fi deschis direct din interfața Home Assistant.
- **Port intern**: portul pe care aplicația ascultă în container.
- **Slug**: identificatorul unic folosit de Home Assistant. Două add-on-uri nu trebuie să aibă același slug.

## Add-on-uri Incluse

### Car Cost Dashboard

Dashboard local pentru evidența costurilor auto. Rulează ca aplicație Node.js simplă și oferă o interfață web pentru cheltuieli, alimentări, backup și restaurare date.

Detalii:

- folder: `car-cost-dashboard`;
- slug: `car_cost_dashboard`;
- versiune: `1.4.4`;
- ingress: activ;
- port intern: `3000`;
- port extern implicit: `3030`;
- date persistente: `/data/car-cost-dashboard`;
- fișiere principale: `server.js`, `public/`, `data/`, `run.sh`.

### Home Cost Dashboard

Dashboard pentru urmărirea și analiza cheltuielilor casei și utilităților. Aplicația rulează prin Node.js și folosește o bază de date JSON locală.

Detalii:

- folder: `home-cost-dashboard`;
- slug: `homecost`;
- versiune: `1.4.1`;
- ingress: activ;
- port intern: `3000`;
- port extern implicit: `3040`;
- date aplicație: `app/database.json`;
- fișiere principale: `app/`, `rootfs/`, `Dockerfile`.

### TubeDash

Aplicație HTML/CSS/JavaScript servită prin NGINX, destinată organizării și vizualizării conținutului YouTube într-un mediu controlat.

Detalii:

- folder: `tubedash-addon`;
- slug: `tubedash`;
- versiune: `5.0.2`;
- ingress: activ;
- port intern: `3000`;
- fișiere principale: `index.html`, `style.css`, `app.js`, `data.json`.

Notă: acest add-on a primit slug-ul `tubedash` pentru a evita conflictul cu `mytubedash-addon`.

### Full Web Server

Server NGINX complet pentru Home Assistant. Servește fișiere din `/share/webserver`, cu suport pentru autoindexare și acces direct prin port mapat.

Detalii:

- folder: `ha-webserver`;
- slug: `full_web_server`;
- versiune: `1.0.4`;
- ingress: activ;
- port intern: `80`;
- port extern implicit: `8080`;
- folder servit: `/share/webserver`;
- fișiere principale: `nginx.conf`, `run.sh`, `Dockerfile`.

### WordPress Full Option

Add-on pentru WordPress cu NGINX, PHP 8.2 și conectare la MariaDB. Fișierele WordPress sunt păstrate în `/share/wordpress`.

Detalii:

- folder: `ha-wordpress-addon`;
- slug: `wordpress_full`;
- versiune: `1.0.2`;
- port intern: `80`;
- port extern implicit: `8090`;
- folder WordPress: `/share/wordpress`;
- necesită bază de date MariaDB configurată separat;
- fișiere principale: `nginx.conf`, `run.sh`, `Dockerfile`.

Configurare implicită:

```yaml
db_host: "core-mariadb"
db_user: "wordpress"
db_password: "Trece_aici_parola_setata_in_MariaDB"
db_name: "wordpress"
```

### MyTube Playlist

Aplicație statică pentru playlist-uri YouTube, cu viewer și editor. Este servită prin NGINX și funcționează prin Ingress.

Detalii:

- folder: `mytubeplaylist-addon`;
- slug: `mytubeplaylist`;
- versiune: `2.0.0`;
- ingress: activ;
- port intern: `3000`;
- fișiere principale: `index.html`, `style.css`, `app.js`, `data.json`, `builder.html`.

### YT Downloader

Aplicație web pentru descărcarea videoclipurilor de pe YouTube. Rulează ca aplicație Node.js și folosește `yt-dlp`/procese auxiliare pentru descărcare.

Detalii:

- folder: `yt-downloader-addon`;
- slug: `yt_downloader`;
- versiune: `4.0.0`;
- ingress: activ;
- port intern: `3000`;
- port extern implicit: `3000`;
- fișiere principale: `src/`, `public/`, `package.json`, `Dockerfile`.

### MyTube Dash

Aplicație HTML/CSS/JavaScript servită prin NGINX pentru dashboard YouTube. Rămâne separată de `TubeDash` și păstrează slug-ul original `mytubedash`.

Detalii:

- folder: `mytubedash-addon`;
- slug: `mytubedash`;
- versiune: `2.0.5`;
- ingress: activ;
- port intern: `3000`;
- fișiere principale: `index.html`, `style.css`, `app.js`.

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

Home Assistant citește folderele de la rădăcina repository-ului. Orice folder care conține un `config.yaml` valid este tratat ca add-on separat.

## Cum Adaugi Un Add-on Nou

1. Creează un folder nou la rădăcina repository-ului.
2. Alege un nume scurt și clar pentru folder, de exemplu:

```text
my-new-addon/
```

3. Adaugă cel puțin aceste fișiere:

```text
my-new-addon/
  config.yaml
  Dockerfile
  README.md
```

4. În `config.yaml`, folosește un `slug` unic:

```yaml
name: "My New Add-on"
version: "1.0.0"
slug: "my_new_addon"
description: "Descriere scurtă a add-on-ului."
url: "https://github.com/vlad2939/home-assistant-addons"
arch:
  - amd64
  - aarch64
startup: application
boot: auto
init: false
```

5. Dacă add-on-ul are interfață web în Home Assistant, adaugă Ingress:

```yaml
ingress: true
ingress_port: 3000
panel_icon: mdi:application
panel_title: "My New Add-on"
```

6. Dacă vrei acces direct din rețea, adaugă și port mapat:

```yaml
ports:
  3000/tcp: 3000
ports_description:
  3000/tcp: "Interfața web"
webui: "http://[HOST]:[PORT:3000]"
```

## Reguli De Mentenanță

- Fiecare add-on își păstrează propria versiune în `config.yaml`.
- Când modifici un add-on, crește versiunea doar pentru acel add-on.
- Nu folosi același `slug` în două add-on-uri diferite.
- Păstrează `url` în fiecare `config.yaml` către repository-ul principal:

```text
https://github.com/vlad2939/home-assistant-addons
```

- Păstrează datele utilizatorului în `/data` sau `/share`, nu în fișiere care se pierd la rebuild.
- Pentru add-on-uri cu fișiere persistente, documentează clar folderul folosit.
- Pentru aplicații web, preferă Ingress dacă vrei acces direct din meniul lateral Home Assistant.

## Actualizare Add-on-uri

Pentru a publica o versiune nouă:

1. Modifică fișierele add-on-ului.
2. Crește `version` în `config.yaml`.
3. Actualizează `README.md`, `DOCS.md` sau `CHANGELOG.md` dacă există.
4. Publică modificările în GitHub.
5. În Home Assistant, intră în Add-on Store și verifică dacă apare actualizarea.

Uneori Home Assistant poate ține cache pentru lista de add-on-uri. Dacă nu apare imediat:

- repornește Home Assistant;
- reîncarcă Add-on Store;
- elimină și adaugă din nou repository-ul;
- verifică dacă `config.yaml` este valid YAML.

## Testare Recomandată

După o modificare importantă, testează cel puțin:

- add-on-ul apare în Add-on Store;
- instalarea pornește fără eroare;
- containerul pornește fără crash;
- Ingress se deschide corect, unde este activ;
- portul extern funcționează, unde este definit;
- datele persistente rămân după restart/rebuild;
- logurile nu conțin erori critice.

Pentru acest repository, testarea manuală principală ar trebui să acopere:

- `ha-webserver` cu fișiere în `/share/webserver`;
- `ha-wordpress-addon` cu MariaDB configurat;
- `car-cost-dashboard` cu date persistente în `/data/car-cost-dashboard`;
- `home-cost-dashboard` cu baza `database.json`;
- `yt-downloader-addon` cu descărcare reală de test.

## Note Importante

- Acest repository conține add-on-uri personale, adaptate pentru uz local în Home Assistant.
- Unele add-on-uri pot necesita configurări suplimentare, cum ar fi MariaDB pentru WordPress.
- Unele add-on-uri expun porturi externe; verifică să nu existe conflicte cu alte servicii din rețeaua ta.
- Dacă folosești backup Home Assistant, include folderele `/share` și datele add-on-urilor pentru a păstra conținutul important.

## Licență

Fiecare add-on păstrează fișierele de licență existente în folderul său, acolo unde acestea există. Dacă adaugi un add-on nou, include o licență potrivită pentru proiectul respectiv.
