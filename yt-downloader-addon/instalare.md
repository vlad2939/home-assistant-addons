# Instalare YT Downloader ca Add-on in Home Assistant

Acest tutorial îți va arăta cum să adaugi și să rulezi aplicația YT Downloader pe sistemul tău Home Assistant (instalat pe NUC).

## 1. Pregătirea repository-ului pe GitHub

Home Assistant impune o structură specifică pentru "Add-on repositories". 
**Atenție:** Fișierul `repository.yaml` trebuie să existe obligatoriu în folderul principal (rădăcina) repository-ului, iar fișierele propriu-zise ale aplicației trebuie așezate într-un sub-folder separat (de exemplu: `yt_downloader`).

1. Asigură-te că toate fișierele proiectului sunt încărcate în contul tău GitHub (`vlad2939`) într-un repository nou (să spunem `yt-downloader-addon`).
2. Structura EXACTĂ pe GitHub **trebuie** să arate astfel:
   ```text
   ├── repository.yaml
   └── yt_downloader/
       ├── Dockerfile
       ├── config.yaml
       ├── package.json
       ├── tsconfig.json
       ├── src/
       │   └── server.ts
       └── public/
           ├── index.html
           ├── style.css
           └── app.js
   ```

## 2. Adăugarea repository-ului în Home Assistant

1. Autentifică-te în interfața **Home Assistant** din rețeaua ta.
2. Navighează la **Settings (Setări)** din meniul din stânga.
3. Selectează **Add-ons**.
4. Apasă pe butonul **ADD-ON STORE (Magazin de addon-uri)** din colțul din dreapta jos.
5. În colțul din dreapta sus, apasă pe cele 3 puncte (Meniu contextual) și selectează **Repositories (Depozite)**.
6. În fereastra care apare, adaugă link-ul către repository-ul tău de pe GitHub:
   `https://github.com/vlad2939/yt-downloader-addon`
   *(înlocuiește "yt-downloader-addon" cu numele exact pe care l-ai folosit pentru repo)*
7. Apasă pe butonul **Add (Adaugă)**. Așteaptă câteva momente până când repository-ul este înregistrat și descărcat. 
8. Închide fereastra popup. Mergi la sfârșitul listei de addon-uri din magazin; ar trebui să apară o nouă secțiune cu repository-ul tău, iar în ea să fie **"YT Downloader"**.

## 3. Instalarea și pornirea Add-on-ului

1. Dă click pe panoul **YT Downloader** din magazin.
2. Apasă pe **Install (Instalare)**.
   *(Atenție: Procesul poate dura până la 5-10 minute, deoarece Home Assistant de pe NUC-ul tău va compila ("build") un container de Docker curat pe baza fișierului `Dockerfile`).*
3. Odată instalarea terminată cu succes, vei reveni la panoul addon-ului. Aici, **este extrem de important să bifezi opțiunile următoare**:
   - **Start on boot** (Pornire automată la bootare)
   - **Show in sidebar** (Afișează pe bara laterală) -> **ACESTA ESTE BUTONUL CARA FACE SĂ APARĂ ICONIȚA ÎN SIDE PANEL!**

Prin activarea modului Ingress în `config.yaml`, Home Assistant rutează traficul intern astfel încât când apeși pe "YT Downloader" din meniul din stânga, interfața grafică pe care tocmai am creat-o va fi redată perfect și integrat (ca și cum ar face parte nativ din aplicația HA), sub titlul de YT Downloader cu o pictogramă YouTube (`mdi:youtube`). 

4. Apasă pe butonul **Start**.
5. Pentru a vedea dacă totul a pornit corect, deschide tab-ul **Log** din partea de sus a paginii addon-ului. După câteva secunde, ar trebui să apară mesajul: `Node Express server listening on http://0.0.0.0:3000`.

## 4. Utilizarea aplicației

Sunt două modalități de a accesa aplicația:
- **Direct prin Home Assistant (Sidebar):** Apasă pe iconița (sau titlul "YT Downloader") direct din bara din stânga. Interfața aplicației se va deschide armonios într-un iframe în cadrul panoului HA.
- **Prin port direct din rețea:** Deschide un browser de web și tastează IP-ul NUC-ului tău, urmat de portul `3000`. Exemplu: `http://192.168.1.100:3000`.

Fii liniștit referitor la stocare! Fișierele video selectate spre descărcare **nu vor umple spațiul de stocare al NUC-ului**. Ele se vor descărca direct pe memoria dispozitivului local din care inițiezi descărcarea (pc-ul tău de pe care accesezi browser-ul, laptop-ul, telefonul, etc.).
