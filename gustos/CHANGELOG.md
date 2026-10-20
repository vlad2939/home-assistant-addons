# Istoric versiuni

## 1.5.0 – 20.10.2026

- **Traducere din engleză**: la rețetele importate în engleză, previzualizarea (și pagina Editează) are butonul **Tradu în română**. Se traduc titlul, descrierea, ingredientele, pașii și sfaturile; cantitățile, unitățile și poza rămân. **Revino la textul în engleză** anulează traducerea.
- **Setări → Traducere din engleză**: „DeepL” (recomandat; cheie API gratuită, cu verificarea caracterelor folosite) sau „Pe NUC” (gratuit, fără cont, model OPUS-MT de ~70 MB descărcat o singură dată; traducere aproximativă). Dacă DeepL nu răspunde, se folosește traducerea pe NUC, când modelul e descărcat.
- Dicționar culinar pentru ingredientele obișnuite („icing sugar” → zahăr pudră, „self-raising flour” → făină cu praf de copt).
- Import în engleză: unitățile americane și britanice devin unități românești (cup → cană, tbsp → lingură, tsp → linguriță, oz / lb → grame, pinch → praf), °F devine °C, iar inch devine cm. Trimiterile „(Note 1)” și măsurile duble („30g / 2 tbsp”) se elimină.
- Sugestia de categorie recunoaște și titlurile în engleză (cake, soup, bread, salad, chicken …).
- Corectură: la editare, limba originală a rețetei nu se mai pierde.
- Modelul de traducere (`/data/models`) nu intră în backup-urile Home Assistant.

## 1.2.0 – 20.10.2026

- **Rețeta mea**: buton nou în formularul Adaugă / Editează care marchează rețeta ca fiind a ta. Rețetele marcate au eticheta „Rețeta mea” pe card și pe pagina rețetei, iar în panoul din stânga apare „Rețetele mele”, cu numărul lor. Pe Acasă, secțiunea „Rețetele mele” apare deasupra celor adăugate recent.
- Setări → Tag-uri: lista ocupă toată înălțimea cardului (cât cel cu categorii), apoi apare bara de derulare.
- Corectură: lista de surse din pagina Rețete nu mai schimbă culorile opțiunilor când e aleasă o sursă.
- Baza de date trece la versiunea 3 (coloana `own`), automat la pornire.

## 1.1.0 – 20.10.2026

- **Video la rețete**: câmp nou „Video (link)” în formular. La import, clipul YouTube / Vimeo al paginii se preia automat. Pe pagina rețetei, clipul pornește direct în pagină (YouTube fără cookie-uri), cu link și spre site-ul clipului.
- **Modul „Gătesc acum”**: pașii pe tot ecranul, cu litere mari, ingredientele alături, navigare cu butoane, săgeți sau glisare, ecranul mereu aprins (inclusiv pe `http://`, prin tehnica NoSleep).
- **Setări → Tag-uri**: redenumirea, unirea și ștergerea tag-urilor.
- **Setări → Pornește în ecran complet** (pe fiecare dispozitiv în parte).
- Titlul „Gustos” din bara de sus este mai mare, cu un efect de lumină în culoarea de accent.
- Acasă: card nou „Cu video” (5 carduri), iar numerele sunt pe același rând cu textul, deci cardurile ocupă mai puțin loc.
- Lista de rețete: filtru nou **Cu video**.
- Separator deasupra mențiunii © din panoul cu categorii.
- Corectură: pagina Setări nu se mai derulează pe orizontală pe telefon.
- Baza de date trece la versiunea 2 (coloana `video_url`), automat la pornire. Backup-urile vechi se pot restaura în continuare.

## 1.0.0 – 19.10.2026

Prima versiune stabilă. Testul de acceptanță (13 criterii) a trecut pe NUC, PC, laptop și tabletă: `docs/test-acceptanta-etapa10.md`.

- Fără modificări de funcționalitate față de 0.9.2.

## 0.9.2 – 19.10.2026

- Bara de sus: butoane pentru ecran complet (ca F11) și schimbarea temei luminoasă / întunecată.
- Mențiunea „© concept și realizare vlad39” mutată la baza panoului cu categorii; bara de subsol a fost eliminată.

## 0.9.1 – 19.10.2026

- Corectură instalare: imaginea de bază Python este fixată în Dockerfile (Supervisor folosea imaginea Alpine fără Python, iar instalarea eșua cu „pip: not found”).

## 0.9.0 – 19.10.2026

Prima versiune instalabilă pe Home Assistant (test înainte de 1.0.0).

- Rețete: adăugare, editare, ștergere, favorite, o poză per rețetă (cu orientare corectată și miniatură).
- Căutare full-text fără diacritice și filtre combinabile (categorie, ingredient, tag-uri, sursă, favorite).
- Pagina rețetei: scalarea porțiilor, ingrediente și pași bifabili.
- Import din link de pe 7 site-uri românești, cu previzualizare editabilă și sugestie de categorie.
- Setări: aspect (dark/light, 5 culori), categorii, site-uri de import, export / restaurare ZIP, manual, Despre.
