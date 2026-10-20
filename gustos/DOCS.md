# Gustos – documentație add-on

## Acces

După pornire, deschide în Chrome `http://IP-HOME-ASSISTANT:8099`, sau apasă **Deschide interfața web** din pagina add-on-ului.

- Pe tabletă: meniul Chrome ⋮ → **Adaugă pe ecranul principal**.
- Recomandare: setează un IP fix pentru Home Assistant (rezervare DHCP din router). Numele `homeassistant.local` nu este recunoscut întotdeauna pe Android.

Aplicația nu are autentificare și este gândită doar pentru rețeaua de acasă. **Nu deschide portul 8099 spre internet** (fără port-forward).

## Setări recomandate în Home Assistant

- **Pornește la boot**: da.
- **Watchdog**: da. Repornește aplicația dacă nu mai răspunde.

## Date și backup

- Toate datele stau în folderul `/data` al add-on-ului: `gustos.db` (baza de date), `photos/` (pozele) și `backups/` (copiile de siguranță dinaintea restaurărilor).
- `/data` se păstrează la actualizări și la reporniri.
- `models/` conține modelul de traducere (dacă îl descarci din Setări). Nu intră în backup-uri; se poate descărca din nou oricând.
- `/data` intră în backup-urile Home Assistant, inclusiv în Google Drive Backup. În timpul backup-ului, add-on-ul se oprește câteva secunde, ca baza de date să fie copiată corect.
- Din aplicație: **Setări → Backup → Exportă tot** descarcă un ZIP cu toate rețetele și pozele. **Restaurează din ZIP** îl readuce.

## Actualizare

Când apare o versiune nouă: **Setări → Aplicații → Gustos → Actualizează**. Dacă nu apare, folosește întâi „Verifică actualizările”. Datele rămân.

## Probleme

- **Aplicația nu se deschide**: verifică tab-ul **Jurnal** al add-on-ului. Ar trebui să apară linia „Gustos pornește pe portul 8099”.
- **Portul 8099 este ocupat** de alt add-on: schimbă portul extern în tab-ul **Configurare → Rețea** și deschide aplicația pe noul port.
- **Importul nu merge**: Home Assistant are nevoie de internet pentru import. Site-ul trebuie să fie în **Setări → Site-uri pentru import**.
- **Traducerea pe NUC nu pornește**: verifică în **Setări → Traducere din engleză** că modelul este descărcat. Pe procesoarele mai vechi, o rețetă poate dura până la un minut.

Traducerea pe NUC folosește modelul OPUS-MT engleză–română (Jörg Tiedemann, Santhosh Thottingal), licență CC-BY 4.0, în varianta publicată de Argos Translate, rulat cu CTranslate2.

Manualul complet de utilizare se găsește în aplicație: **Setări → Manual de utilizare**.

---

© concept și realizare vlad39
