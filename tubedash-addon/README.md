# 📺 MyTube Dash

> **Dashboard personal pentru vizionarea clipurilor YouTube. Fără algoritmi, fără notificări, 100% control vizual.**

![Versiune](https://img.shields.io/badge/versiune-5.0.0-blue.svg)
![Arhitectura](https://img.shields.io/badge/arhitectură-Vanilla_JS_|_NGINX-red.svg)
![Date](https://img.shields.io/badge/bază_de_date-data.json-4CAF50.svg)
![Setup](https://img.shields.io/badge/platformă-Home_Assistant_Add--on-03A9F4.svg)

**MyTube Dash** este o aplicație web nativă, minimalistă, creată cu un singur scop: să ofere o evadare din „rabbit-hole-ul” algoritmilor YouTube. Aduni strict videoclipurile pe care vrei să le urmărești (podcasturi, documentare, tutoriale) și le vizionezi într-un mediu profund izolat.

Începând cu versiunea 4.1, aplicația aduce un nivel superior de stabilitate și productivitate, adăugând un motor de căutare live și protecție sistematică împotriva erorilor de sintaxă la scrierea bazei de date.

---

## ✨ Funcționalități Principale

*   **🚫 Fără Recomandări:** Videoclipurile rulează pe ecran complet prin modulul oficial de Embed, blocând fluxurile de recomandări de la final și distragerile laterale.
*   **🔍 Căutare Globală Rapidă (Live Search):** Găsește video-ul preferat instant. Bara de căutare filtrează în timp real titlurile clipurilor și ale colecțiilor din întreaga bază de date, etichetând elegant sursa fiecărui rezultat.
*   **🛡️ Validator JSON de Siguranță:** Editarea manuală a bazei de date e acum complet sigură. Dacă omiți o virgulă sau greșești o ghilimea în `data.json`, aplicația te va alerta vizual, afișând un raport clar al zonei în care s-a produs eroarea de sintaxă.
*   **💾 Stocare JSON 100% Sigură:** Baza de date este strict fișierul fizic `data.json`. Tu controlezi textul, tu deții datele pentru totdeauna.
*   **🧠 Preluare Automată:** Tu treci în fișier doar titlul dorit și adresa web (URL-ul) către YouTube. Aplicația extrage singură în fundal codurile video și imaginile de copertă la rezoluție maximă.
*   **🎨 High-End UI:** Construit nativ cu ajutorul *Tailwind CSS*. Efecte fine de fade-in, umbre subtile de profunzime tip macOS, scrollbar-uri minimaliste și butoane plutitoare de play la intersecția cu mouse-ul.
*   **🚀 Ultra-ușor:** Niciun framework (fără Angular, React, Vue). Fără node_modules. Servește doar fisiere de bază prin NGINX. Consumă ~0% CPU în mod repaus pe Home Assistant.

---

## 📝 Cum adaugi clipuri noi? (Data.json)

Întreaga magie este gestionată de fișierul `data.json` localizat în folderul principal. Pentru a adăuga secțiuni și clipuri, pur și simplu modifici acest fișier respectând structura de mai jos:

```json
{
  "playlists": [
    {
      "title": "Muzică Rock & Classic",
      "videos": [
        { "title": "Clip #01", "url": "https://www.youtube.com/watch?v=mIYz......", "duration": "8:15" },
        { "title": "Clip #02", "url": "https://www.youtube.com/watch?v=Dx5q......", "duration": "12:45" },
        { "title": "Clip #03", "url": "https://www.youtube.com/watch?v=mIYz......", "duration": "18:10" }
      ]
    },
    {
      "title": "Podcasturi Extra-Lungi",
      "videos": [
        { "title": "Podcast #01", "url": "https://www.youtube.com/watch?v=p7b......", "duration": "10:15" },
        { "title": "Podcast #02", "url": "https://www.youtube.com/watch?v=air......", "duration": "16:35" },
        { "title": "Podcast #03", "url": "https://www.youtube.com/watch?v=fEN......", "duration": "17:45" }
      ]
    }
  ]
}
```
**Notă:** Aplicația acceptă orice format de link YouTube (`youtube.com/watch?v=...`, `youtu.be/...`, `youtube.com/embed/...`).

---

## 🛠️ Instalare ca Add-on în Home Assistant

Aplicația vine pregătită standard cu tot ce are nevoie mediul Home Assistant (`config.yaml`, `Dockerfile` NGINX nativ).

1. Mergi în **Settings** -> **Add-ons** -> **Add-on Store**.
2. Dă click pe cele 3 puncte (dreapta-sus) -> **Repositories**.
3. Adaugă adresa `URL` a contului/repo-ului tău de GitHub unde ai urcat aceste fișiere.
4. Caută în listă la repository-ul tocmai adăugat **"MyTube Dash - Vanilla Edition"** și dă-i "Install".
5. Bifează **"Show in sidebar"** și apasă **Start**.

Când vrei să adaugi un clip nou: modifici `data.json` la tine pe GitHub/local, iar în Home Assistant la Add-on apasă butonul de **Actualizare** (sau Rebuild) ca să descarce fișierul modificat.

---

## 💻 Rulare locală (Standalone)

Fiind o capodoperă HTML nativ, se poate folosi extrem de ușor oriunde:
1. Descarcă codul sursă.
2. Pornește orice server static deținut (ex: Extensia *Live Server* din VS Code, comanda `python -m http.server 3000`, sau `npx serve -l 3000`).
3. Intră de pe telefon sau desktop pe rețea – rulează impecabil!

---

<br>

> **@ concept și realizare vlad 39**
