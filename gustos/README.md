# Gustos

Aplicație web personală pentru rețete culinare, ca add-on Home Assistant OS. Rulează în rețeaua locală și se deschide în Chrome, pe laptop, PC sau tabletă.

## Funcții

- **Căutare** în toate rețetele, fără diacritice: după titlu, descriere, ingrediente și tag-uri. Filtrele (categorie, ingredient, tag-uri, sursă, favorite) se pot combina.
- **Adăugare și editare** completă: poză (fișier sau camera tabletei), ingrediente pe grupuri, pași reordonabili, sfaturi, note.
- **Import dintr-un link** de pe site-urile permise (românești și englezești), cu previzualizare editabilă înainte de salvare.
- **Traducere din engleză** în română: pe NUC (gratuit, fără cont) sau cu DeepL; unitățile americane devin metrice.
- **Scalarea porțiilor**, cu bife la ingrediente și pași pe măsură ce gătești.
- Modul **„Gătesc acum”**: pașii unul câte unul, pe tot ecranul, cu ecranul mereu aprins.
- **Video**: clipurile YouTube / Vimeo ale rețetelor se redau direct în pagină (preluate automat la import).
- **Rețetele mele**: rețetele proprii, marcate cu „Rețeta mea”, au listă separată.
- Teme **dark / light** și 5 culori de accent; editor de categorii și tag-uri.
- **Export ZIP și restaurare**, cu copie de siguranță automată.
- Manual de utilizare inclus, în română.

## Instalare

1. În Home Assistant: **Setări → Aplicații → Magazin** → meniul ⋮ → **Repositories**. Adaugă `https://github.com/vlad2939/home-assistant-addons` (dacă nu e deja adăugat).
2. Caută **Gustos** → **Instalează** → **Pornește**. La prima instalare, construirea durează câteva minute.
3. Deschide `http://IP-HOME-ASSISTANT:8099`.

Detalii în tab-ul **Documentație** al add-on-ului.

## Tehnologii

Python (FastAPI), SQLite cu căutare full-text, React (Vite) și Tailwind CSS.

---

© concept și realizare vlad39
