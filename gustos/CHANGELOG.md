# Istoric versiuni

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
