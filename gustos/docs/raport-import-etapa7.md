# Raport import – etapa 7

*19 octombrie 2026 · 14 linkuri reale (câte 2 de pe fiecare site) · previzualizare + salvare + descărcarea pozei, prin API-ul aplicației*

## Ce publică fiecare site

| Site | Date schema.org | Plugin rețete | Cum se citește |
| --- | --- | --- | --- |
| jamilacuisine.ro | complete | WP Recipe Maker | plugin + schema.org |
| savoriurbane.com | ingrediente, porții, timpi (fără pași) | – | schema.org + pașii din pagină |
| lauraadamache.ro | parțiale (ingrediente lipite, fără pași) | – | pagina, după titluri; timpii din schema.org |
| retetelemihaelei.com | lipsă | – | pagina („Ingrediente:” + listă + paragrafe) |
| teoskitchen.ro | lipsă | – | pagina, după titluri |
| adihadean.ro | lipsă | – | pagina, după titluri și grupuri „Pentru …” |
| sefpaulconstantin.ro | lipsă | – | pagina, după titluri (Elementor) |

Concluzie: biblioteca `recipe-scrapers` singură ar fi acoperit corect doar 1 site din 7. De aceea extragerea combină plugin + schema.org + citirea paginii după titluri.

## Rezultate

| Site | Link | Ingrediente (cu cantitate) | Grupuri | Pași | Porții / timpi | Poză | Categorie sugerată |
| --- | --- | --- | --- | --- | --- | --- | --- |
| savoriurbane.com | tocanita-de-porc-porkolt | 10 (9) | – | 6 | 6 / 10+60 | ✔ | Fel principal |
| savoriurbane.com | ketchup-de-casa-reteta-simpla | 13 (12) | – | 11 | 2 / 60+60 | ✔ | Sosuri |
| jamilacuisine.ro | kebab-la-tava | 10 (9) | – | 12 | 6 / 20+30 | ✔ | Fel principal |
| jamilacuisine.ro | pui-toscan-in-sos-cremos | 12 (10) | – | 14 | 5 / 10+50 | ✔ | Fel principal |
| retetelemihaelei.com | ardei-capia-copti-la-borcan | 7 (3) | – | 7 | – | pagina nu are poză | Conserve și murături |
| retetelemihaelei.com | briose-foarte-pufoase-cu-cacao | 10 (9) | – | 9 | – | pagina nu are poză | Deserturi |
| teoskitchen.ro | paste-alla-amatriciana | 10 (7) | – | 8 | 2 / – | ✔ | Fel principal |
| teoskitchen.ro | paine-de-casa-rapida | 5 (5) | – | 11 | – | ✔ | Panificație și patiserie |
| adihadean.ro | chifle-cu-cascaval-si-chimen | 13 (7) | 2 | 17 | – | ✔ | Panificație și patiserie |
| adihadean.ro | lasagna-cu-porc-si-ciuperci | 16 (14) | 2 | 18 | 6 / – | ✔ | Fel principal |
| lauraadamache.ro | ciorba-de-perisoare | 31 (30) | 3 | 33 | – / 20+45 | ✔ | Supe și ciorbe |
| lauraadamache.ro | chec-cu-albusuri-si-mere | 10 (10) | – | 11 | – / 20+30 | ✔ | Deserturi |
| sefpaulconstantin.ro | cartofi-taranesti-la-tigaie | 8 (8) | – | 7 | – | ✔ | Garnituri |
| sefpaulconstantin.ro | cinteu-de-pui-moldovenesc | 9 (7) | – | 6 | – | ✔ | Fel principal |

„Cu cantitate” = rândurile la care s-au recunoscut cantitatea și/sau unitatea. Restul sunt ingrediente fără cantitate pe site („sare”, „piper”, „unt”) – corect.

## Ce a ieșit corect

- Titlul, fără numele site-ului și fără „– Rețetă video” la final.
- Ingredientele: cantitate, unitate (și scrise fără diacritice: „lingurita”, „catei”), denumire și notă („ceapă, tocată” → notă „tocată”; parantezele → notă).
- „un praf”, „1-2”, „2-3” păstrate ca text (nu se scalează); „sare, după gust” → unitatea „la gust”.
- Grupurile de ingrediente („Pentru aluat”, „Pentru sosul Bechamel”, „Pentru supa de oase de vită”).
- Pașii: numerotarea „1.”, „01 -” eliminată; introducerile, salutările („Poftă bună!”) și semnăturile eliminate.
- Sfaturile, unde site-ul are o secțiune dedicată.
- Poza descărcată pe server, convertită în WebP, cu miniatură.
- Duplicate: același link (cu sau fără „/” final, cu sau fără „www”) este semnalat înainte de salvare.
- Site nepermis: mesaj clar și link către Setări. Adresele din rețeaua locală sunt blocate.

## Ce nu iese (și se corectează în previzualizare)

- **Textele fără diacritice** rămân așa cum le scrie site-ul („Tocanita de porc”). Căutarea le găsește oricum.
- **Porțiile** lipsesc la jumătate din rețete, pentru că multe site-uri nu le scriu. Fără porții nu merge scalarea, deci trebuie completate manual.
- **Timpii** lipsesc acolo unde site-ul nu îi publică în date structurate.
- **Pașii** includ uneori explicații sau variante alternative (de exemplu „frământare cu mixerul” și „frământare manuală” la adihadean). Se șterg ușor din previzualizare.
- **Rânduri complexe** rămân în denumire, pentru corectare manuală. Exemple: „câte o lingură de: oregano, busuioc…” și „2 L bulion sau 2 L suc de roșii sau…”.
- **Categoria** este doar o sugestie, după titlu.
- **Formatul paginilor se poate schimba.** Dacă un site își schimbă structura, importul poate scoate mai puține date; previzualizarea rămâne editabilă.
