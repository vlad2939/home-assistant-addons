# 📺 MyTube Dash

> **Dashboard personal pentru vizionarea clipurilor YouTube.**

![Versiune](https://img.shields.io/badge/versiune-2.0.5-blue.svg)
![Arhitectura](https://img.shields.io/badge/arhitectură-Vanilla_JS_|_NGINX-red.svg)
![Setup](https://img.shields.io/badge/platformă-Home_Assistant_Add--on-03A9F4.svg)

MyTube Dash este o aplicație web nativă (Single Page Application) gândită special pentru a fi integrată în **Home Assistant**, dar care poate rula oriunde. Scopul ei principal este să te protejeze de „rabbit-hole-ul” algoritmilor YouTube. Salvezi strict videoclipurile pe care vrei să le urmărești (podcasturi, tutoriale, interviuri) și le vizionezi într-un mediu curat, izolat și fără distracții.

---

## ✨ Funcționalități Principale

*   **🚫 Fără Recomandări:** Videoclipurile rulează în modul `youtube-nocookie.com`, fără o interfață încărcată, fără reclame agresive și fără feed de final.
*   **📂 Manager de Playlist-uri:** Creează secțiuni și foldere personalizate pentru a-ți grupa videoclipurile (ex: *Muzică, Podcasturi, Tutoriale Frontend*).
*   **🖼️ Preluare Automată:** Adaugă doar linkul (URL-ul) de la YouTube, iar aplicația calculează singură ID-ul videoclipului și descarcă automat imaginea de copertă (Thumbnail-ul).
*   **🔒 Intimitate Absolută (Local Storage):** MyTube Dash nu are un server propriu de baze de date. Toate listele tale sunt salvate strict în memoria browser-ului (LocalStorage) sau în WebView-ul aplicației Companion. Nimeni nu știe la ce te uiți.
*   **🌙 Design Natival Dark Mode:** Interfață construită estetic tip "Netflix" folosind Tailwind CSS, optimizată pentru contrast perfect noaptea sau direct pe dashboard-ul tabletei de pe perete.

---

## 🛠️ Detalii Tehnice (Vanilla Edition v2.0.5)

Baza arhitecturii:
*   Fără rețele complexe Node.js / NPM / Angular.
*   **Frontend-ul** este scris în **HTML pur, Tailwind (CDN) și Vanilla JavaScript**. 
*   **Backend-ul** (Containerul Docker pentru Add-on) folosește o imagine ușoară de **Linux Alpine NGINX**.

Această simplitate garantează timp de răspuns instant, zero întârzieri (0 dependențe software) la afișarea în IFRAME și funcționare _bulletproof_ pe orice tip de SBC (Raspberry Pi, NUC, etc).

---

## 🚀 Instalare ca Add-on în Home Assistant

Aplicația vine pregătită standard cu fișierele: `config.yaml`, `Dockerfile` și `repository.yaml`.

1. Deschide interfața web Home Assistant.
2. Navighează la **Settings** -> **Add-ons** -> **Add-on Store**.
3. În colțul din dreapta sus (cele 3 puncte verticale), dă click pe **Repositories**.
4. Adaugă adresa `URL` a acestui depozit GitHub.
5. Apasă `Add`, și încarcă din nou pagina cu Store-ul. 
6. Caută în listă la repository-ul tocmai adăugat **"MyTube Dash - Vanilla Edition"** și instalează-l.
7. Opțional (dar recomandat): Bifează "Show in sidebar" pentru pornire rapidă, apoi dă **Start**.

---

## 💻 Rulare locală (Standalone)

Fiind o aplicație nativă, o poți testa și fără Docker sau Home Assistant direct pe propriul tău PC.
Metoda:
1. Descarcă codul sursă.
2. Pornește orice executabil static pentru directori (ex: Live Server din VS Code, `python -m http.server 3000`, sau `npx serve -l 3000`).
3. Accesează `http://localhost:3000` în browser.

---

**@** concept și realizare *vlad39*
