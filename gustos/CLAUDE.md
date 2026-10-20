# Gustos – reguli pentru Claude Code

Proiect: Gustos – aplicație web de rețete, add-on Home Assistant OS.
Stack: Python FastAPI + SQLite (WAL, FTS5) + React (Vite) + Tailwind.
Utilizator: un singur utilizator, rețea locală, fără autentificare. Interfață doar în română.
Port: 8099. Date persistente: /data (gustos.db, photos/). În dezvoltare: ./dev-data (în .gitignore).
Layout: TopBar (logo clickabil, titlul „Gustos” cu efect shimmer, Acasă, Rețete, Adaugă, Import, Setări; în dreapta: ecran complet, temă), SideBar (Toate, Favorite, Rețetele mele, categorii), cu separator și "© concept și realizare vlad39" la baza lui (fără bară de subsol).
Import în engleză: unități metrice + „Tradu în română” (services/translate.py: OPUS-MT local prin CTranslate2 sau DeepL; model în /data/models).
Pagina rețetei: video (YouTube / Vimeo, încărcat la click) și modul „Gătesc acum” (ecran mereu aprins: Wake Lock sau clipul mut din public/keep-awake.*).
Modale (ESC și click închid, fundal blurat în ton cu tema): logo lightbox fără text, manual_utilizare.md, Despre.
Teme: dark/light + 5 culori de accent (portocaliu implicit), prin variabile CSS.
Utilizatorul nu are cunoștințe de programare: explică simplu, dă comenzi complete copy-paste.
După fiecare etapă: rulează testele, spune cum testez manual, așteaptă confirmarea mea.
Nu pune parole, chei sau date personale în cod. Nu face commit pe dev-data/.
Versiunea add-on-ului: o singură sursă, config.yaml.

## Detalii tehnice (v1.1)

- Planul complet: `Gustos – Plan de realizare.md`. Se urmează etapă cu etapă (secțiunea 13).
- Dezvoltare în acest folder (repo Git local). În etapa 9 conținutul se copiază în
  `vlad2939/home-assistant-addons/gustos/`.
- Migrări: fișiere SQL numerotate în `backend/app/migrations/`, versiune în `PRAGMA user_version`. Fără Alembic.
- Interfața se compilează cu `npm run build` în `frontend/`; rezultatul ajunge în `backend/app/static/` și se salvează în Git.
- Variabila `GUSTOS_DATA_DIR` indică folderul de date (implicit `./dev-data`, în add-on `/data`).
- Texte românești: se normalizează ş/ţ (sedilă) la ș/ț (virgulă).

## Comenzi (PowerShell, din folderul proiectului)

- Pornire server dezvoltare: `.\dev.ps1`
- Teste backend: `backend\.venv\Scripts\python -m pytest backend\tests`
- Teste interfață (scalare porții etc.): `cd frontend; npm test`
- Compilare interfață: `cd frontend; npm run build`
- Rețete de test în dev-data: `backend\.venv\Scripts\python tools\seed_dev.py` (opțional `--count 250`)
