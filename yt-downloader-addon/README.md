# Home Assistant Add-on: YT Downloader

![Supports aarch64](https://img.shields.io/badge/aarch64-yes-green.svg) ![Supports amd64](https://img.shields.io/badge/amd64-yes-green.svg) ![Supports armhf](https://img.shields.io/badge/armhf-yes-green.svg) ![Supports armv7](https://img.shields.io/badge/armv7-yes-green.svg) ![Supports i386](https://img.shields.io/badge/i386-yes-green.svg)

Acesta este un repository custom de addon-uri pentru Home Assistant care conține aplicația **YT Downloader**.

Aplicația este o interfață web simplă și elegantă (cu design glassmorphism, temă Light/Dark) integrată direct în Home Assistant (cu suport Ingress pentru Side Panel) pentru extragerea de audio/video de pe YouTube la multiple rezoluții, inclusiv 4K.

## Funcționalități
* **Extragere Audio MP3**: Poți extrage doar partea audio a unui videoclip și o poți salva direct ca MP3.
* **Descărcare Video**: Opțiuni de a descărca video cu sau fără audio, la rezoluții alese (720p, 1080p, 1440p, 2160p 4K).
* **Temă Adaptivă Light/Dark**: Layout curat, profesional cu comutator de temă noapte/zi.
* **Integrare Side Panel (Ingress)**: Utilizează Add-on-ul direct din bara laterală a Home Assistant, fără porturi publice expuse sau tab-uri adiționale.
* Fără reclame, integrat nativ, sigur de folosit.
* Fișierele se descarcă local pe dispozitivul de pe care accesezi vizualizarea Home Assistant (Laptop, PC, Telefon, etc.), fără a ocupa spațiu permanent pe server-ul/NUC-ul tău. Mentine SSD-ul NUC-ului curat! În timpul conversiei fișierele sunt stocate temporar în backend, apoi șterse.

## Adăugarea repository-ului în Home Assistant

Puteți instala acest add-on manual, adăugând acest repository in magazinul instanței de Home Assistant.

**Metoda Manuală:**
1. Deschide interfața Home Assistant.
2. Navighează către **Settings** (Setări) -> **Add-ons** (Suplimente).
3. Apasă pe **Add-on Store** (Magazin de suplimente) - butonul din dreapta jos.
4. Dă click pe meniul cu cele 3 puncte (sus-dreapta) și alege **Repositories** (Depozite).
5. Introdu URL-ul acestui depozit:
   `https://github.com/vlad2939/yt-downloader-addon`
6. Apasă pe **Add**.

## Instalarea Add-on-ului
1. După adăugarea depozitului, închide fereastra pop-up și derulează la sfârșitul paginii **Add-on Store** pentru a găsi noul depozit.
2. Selectează **YT Downloader**.
3. Apasă pe **Install**. *Atenție: Acest proces de instalare presupune "building" pe NUC-ul tău, așa că instalarea poate dura câteva minute.*
4. După instalare, bifează următoarele:
   * **Start on boot**
   * **Show in sidebar** *(foarte important pentru a vedea aplicația în stânga în meniul HA!)*
5. Apasă pe **Start**.

Bucură-te de descărcări ușoare și rapide!
