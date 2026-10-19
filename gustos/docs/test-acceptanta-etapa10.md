# Test de acceptanță – etapa 10

*19 octombrie 2026 · versiunea 0.9.2 instalată pe NUC (`hass:8099`) · rezultat: toate criteriile trecute → versiunea 1.0.0*

Testele care modifică date au rulat pe o **copie de test** (un export al datelor de pe NUC, încărcat pe PC). Pe NUC s-au făcut doar citiri și previzualizări de import, care nu salvează nimic.

| # | Criteriu (plan, secțiunea 17) | Rezultat | Cum s-a verificat |
| --- | --- | --- | --- |
| 1 | Se deschide pe laptop, PC și tabletă, cu layout corect | ✔ | confirmat de utilizator după instalarea 0.9.2 |
| 2 | Logo-ul deschide lightbox-ul blurat, fără text; se închide cu ESC și click | ✔ | browser: fără text, blur 24 px, ESC și click închid |
| 3 | Manualul și „Despre” se deschid din Setări, în modale blurate, cu „© concept și realizare vlad39”; mențiunea apare în aplicație | ✔ | browser: ambele modale, © prezent; © la baza panoului cu categorii (v1.1: fără bară de subsol) |
| 4 | Dark/light și cele 5 culori funcționează peste tot, inclusiv în modale | ✔ | browser: 2 teme × 5 culori; fundalul blurat și fereastra modalului urmează tema |
| 5 | Rețetă cu poză din camera tabletei, corect orientată | ✔ | automat: poză „ținută vertical” (EXIF 6) salvată pe verticală, EXIF eliminat; utilizatorul: poză făcută cu tableta, corect orientată |
| 6 | Editare completă: ingrediente, pași, tag-uri, poză | ✔ | API: toate câmpurile, grupuri, poză înlocuită (cea veche ștearsă de pe disc) |
| 7 | Import reușit de pe fiecare din cele 7 site-uri; site nepermis refuzat clar | ✔ | pe NUC: previzualizare reușită pe un link nou de pe fiecare site; bbcgoodfood.com refuzat (403, mesaj clar). Salvarea cu poză a fost testată în etapa 7 pe 14 linkuri; utilizatorul: rețetă importată și salvată pe NUC, cu poză |
| 8 | Căutarea găsește fără diacritice, după ingredient, categorie, tag, sursă, favorite, în combinație | ✔ | API: 6 combinații |
| 9 | Scalarea porțiilor corectă; „la gust” și „un praf” nu se modifică | ✔ | browser: 6 → 12 porții (500 g → 1 kg, 1 bucată → 2 bucăți); „un praf”, „la gust” neschimbate; 28 de teste automate |
| 10 | Ștergerea cere confirmare și elimină și poza | ✔ | confirmare verificată în etapa 5; API: rețeta, poza și miniatura dispar |
| 11 | După repornirea add-on-ului și după o actualizare, datele rămân | ✔ | actualizarea 0.9.1 → 0.9.2 pe NUC a păstrat datele; repornire simulată pe copia de test (date și căutare intacte); utilizatorul: repornire reală pe NUC, datele au rămas |
| 12 | Export ZIP și restaurare funcționează | ✔ | export de pe NUC reușit (2,2 MB); restaurare pe copie: aceleași numere, poze încărcate, copie de siguranță creată |
| 13 | Cu 250 de rețete, lista se încarcă rapid pe tabletă | ✔ (estimat) | copie de test cu 250 de rețete: răspuns în 0,02 s, afișare în 0,13 s la mărime de tabletă; NUC cu 41 de rețete: ~0,1 s |

Plus: 186 de teste automate pentru server și 28 pentru interfață, toate trecute.

## Verificări manuale (făcute de utilizator, toate trecute)

- [x] **5** – pe tabletă: Adaugă → Fă o poză (ținând tableta vertical) → Salvează → poza apare corect.
- [x] **7** – pe NUC: importă și **salvează** o rețetă de pe un site (poza se descarcă pe NUC).
- [x] **11** – în Home Assistant: Gustos → **Repornește**; rețetele rămân.
- [x] **Backup HA** – Setări → Sistem → Backup-uri: Gustos este inclus în backup.
- [x] **Ecran complet** – butonul din dreapta sus, în Chrome, pe PC și pe tabletă.
