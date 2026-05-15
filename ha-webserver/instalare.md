# Ghid Detaliat de Instalare pentru Add-on (GitHub & Home Assistant)

Acest document îți explică pas cu pas cum să adaugi fișierele generate pe repository-ul tău GitHub și să le instalezi pe Home Assistant v.17.2 rulat pe Intel NUC-ul tău.

## 1. Pregătirea contului de GitHub (user: vlad2939)

1. Autentifică-te pe GitHub și mergi la profilul tău (`github.com/vlad2939`).
2. Creează un repository NOU public făcând click pe butonul **"New"**.
   - Numește-l, de exemplu: `ha-webserver`.
   - Bifează să fie **Public** (dacă e privat, Home Assistant nu îl va putea citi nativ fără token).
3. Încarcă structura de directoare. Fișierele trebuie să arate exact așa pe GitHub:
   ```text
   📁 ha-webserver (Repo-ul principal)
   ├── 📄 repository.yaml
   └── 📁 webserver
       ├── 📄 config.yaml
       ├── 📄 Dockerfile
       ├── 📄 nginx.conf
       ├── 📄 run.sh
       ├── 📄 README.md
       └── 📄 instalare.md
   ```

*Notă FOARTE IMPORTANTĂ*: Fișierul Dockerfile a fost salvat temporar pe această platformă cu numele `Dockerfile.txt` pentru a putea fi descărcat și vizualizat corect fără erori de extensie. **Când îl încarci / uploadezi pe GitHub, te rog să îi ștergi extensia `.txt` și să îl lași doar cu numele `Dockerfile`** (fără niciun punct la sfârșit sau altă literă).

*Notă pentru Windows/Mac: Poți pur și simplu să extragi fișierele generate aici, să le tragi în interfața web GitHub "Upload files". Având în vedere structura pe care am pregătit-o, se vor pune singure la locul corect.*

## 2. Configurare Repository în Home Assistant pe NUC

1. Deschide interfața ta Home Assistant.
2. În meniul din stânga, fă click pe **Settings** (Setări) -> **Add-ons**.
3. În colțul din dreapta jos, fă click pe butonul **ADD-ON STORE** (Magazin de add-on-uri).
4. În colțul din dreapta sus al Add-on Store, apasă pe cele **3 puncte verticale** (⋮) și selectează **Repositories**.
5. În fereastra pop-up care apare, copiază și lipește link-ul noului tău repository de pe GitHub. Va fi ceva de genul:
   `https://github.com/vlad2939/ha-webserver`
6. Apasă butonul **ADD** (Adaugă). 
7. Închide fereastra modală. Acum, Home Assistant va sincroniza repository-ul.
8. **FOARTE IMPORTANT**: Dacă add-on-ul nu apare automat în lista de mai jos, mergi iar sus la cele **3 puncte verticale** (⋮) din Add-on Store și apasă **"Check for updates"** (sau "Reload"). Acest pas forțează Home Assistant să citească noile imagini din GitHub-ul tău!

## 3. Instalarea și Rularea Add-on-ului (Web Server)

1. După ce ai adăugat repository-ul, derulează în jos în lista din _Add-on Store_. Vei vedea o secțiune nouă numită: **"Vlad2939 Home Assistant Add-ons"**.
2. Acolo ar trebui să vezi add-on-ul card cu numele **"Full Web Server"**. 
3. Fă click pe el și apasă **INSTALL**. *(Procesul poate dura câteva minute deoarece Intel NUC-ul tău va descărca imaginea de Alpine Linux și va construi/compila Dockerfile-ul pe loc)*.
4. După instalare, înainte de a-l porni:
   - Apasă pe tab-ul **Configuration** din susul paginii add-on-ului.
   - Verifică portul alocat (default e 8080).
   - Apasă **Save**.
5. Întoarce-te pe tab-ul **Info**, bifează funcțiile de _Start on boot_ (și opțional Watchdog).
6. Apasă pe **START**.

## 4. Testarea Funcționalității

Apasă pe tab-ul **Log** din partea de sus a add-on-ului și apasă Refresh la terminare. Vei vedea mesajul:
_"Initializare Full Web Server Add-on... Directorul /share/webserver nu exista. Il creez acum... S-a creat un fisier index.html demonstrativ. Pornire server NGINX..."_

1. Deschide un browser nou.
2. Scrie IP-ul NUC-ului tău urmat de port. Ex: `http://192.168.1.100:8080`.
3. Trebuie să vezi mesajul "Server Web NGINX Funcțional!".

Pentru a modifica site-ul (fisierele Web): Folosește extensia *Samba share* sau *Studio Code Server / File editor* din HA, accesează folderul **share -> webserver** și plasează poze, fișiere mp4, site-uri statice `.html`, fișiere de descărcare. Ele vor actualiza instantaneu pe adresa web!
