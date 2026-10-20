# Site-uri pentru import – listă verificată

*Testat pe 19 octombrie 2026, de pe PC-ul din rețeaua de acasă (aceeași conexiune la internet ca NUC-ul). Site-urile se schimbă în timp, deci rezultatele pot varia.*

## Cum am verificat

Pentru fiecare site am luat 2–4 pagini reale de rețetă și am verificat trei lucruri:

1. **Acces:** site-ul răspunde la o cerere automată, adică exact cum o face Gustos.
2. **schema.org complet:** pagina publică datele standard ale rețetei: titlu, cel puțin 3 ingrediente, pași. Pe astea se bazează biblioteca `recipe-scrapers`.
3. **Extragerea Gustos:** ce iese efectiv în previzualizare: ingrediente, pași, porții, timpi, poză.

Biblioteca `recipe-scrapers` are suport dedicat pentru 742 de site-uri, dar **niciunul românesc**. Pentru site-urile românești contează deci doar dacă publică date schema.org complete.

Un site nou se adaugă din **Setări → Site-uri pentru import**, unde scrii doar domeniul (de exemplu `petitchef.ro`).

---

## În română

### Recomandate (date complete)

| Site | Ce este | Rezultat test |
| --- | --- | --- |
| **jamilacuisine.ro** | blogul Jamilei, rețete românești cu video | ✔ complet, inclusiv grupuri de ingrediente (deja în listă) |
| **petitchef.ro** | rețete trimise de cititori, foarte multe deserturi și mâncăruri de zi cu zi | ✔ complet: ingrediente, pași, porții, timpi, poză (4 din 4 pagini) |

### Parțiale (merg, dar verifică previzualizarea)

| Site | Observații |
| --- | --- |
| **reteteculinare.ro** | Unele pagini au schema.org, altele nu. Extragerea Gustos găsește totuși ingredientele și pașii, dar uneori sparge pașii în prea multe bucăți. Porțiile lipsesc. |
| **savoriurbane.com** | Deja în listă. Ingrediente, porții și timpi din schema.org; pașii se citesc din pagină. |
| **lauraadamache.ro** | Deja în listă. Datele schema.org sunt incomplete; Gustos citește pagina după titluri. |

### Testate, fără date schema.org

Pe aceste site-uri, testul de 4 pagini n-a găsit date schema.org complete: bucataras.ro, retete.unica.ro, e-retete.ro, pofta-buna.com, kudika.ro, simonacallas.com, dulciurifeldefel.ro.

Pot funcționa parțial prin citirea paginii după titluri (ca la retetelemihaelei.com), dar nu le-am verificat pe fiecare. Dacă vrei unul, îl adaug și îl testez separat.

> Concluzie pentru română: aproape toate blogurile românești publică rețetele ca articole simple, fără date standard. De aceea importul Gustos citește și pagina, nu doar schema.org.

---

## În engleză (pentru v1.5, cu traducere)

### Recomandate (✔ acces, schema.org complet, extragere bună)

| Site | Ce este | Test (exemple de pagini) |
| --- | --- | --- |
| **bbcgoodfood.com** | revista BBC Good Food (Marea Britanie), mii de rețete testate | ✔ ingrediente, pași, porții, timpi, poză |
| **bbc.co.uk** (secțiunea /food) | arhiva de rețete BBC Food | ✔ complet |
| **jamieoliver.com** | rețetele lui Jamie Oliver | ✔ complet (24 ingrediente, 10 pași într-un test) |
| **recipetineats.com** | RecipeTin Eats (Nagi Maehashi), unul dintre cele mai citite bloguri de rețete | ✔ complet, cu grupuri de ingrediente |
| **natashaskitchen.com** | Natasha's Kitchen, rețete de familie, multe cu video | ✔ complet |
| **onceuponachef.com** | Once Upon a Chef (Jennifer Segal), rețete testate pas cu pas | ✔ complet |
| **kingarthurbaking.com** | King Arthur Baking, referință pentru pâine și patiserie | ✔ complet |
| **tasteofhome.com** | Taste of Home, rețete de casă trimise de cititori | ✔ complet |
| **bonappetit.com** | revista Bon Appétit | ✔ complet |
| **epicurious.com** | Epicurious (Condé Nast), arhivă mare de rețete | ✔ ingrediente și pași; timpii lipsesc des |
| **delish.com** | Delish, rețete rapide | ✔ complet |
| **tasty.co** | Tasty (BuzzFeed), rețete cu video scurte | ✔ complet |
| **food52.com** | Food52, comunitate de gătit | ✔ ingrediente, pași, porții |
| **minimalistbaker.com** | rețete cu puține ingrediente, multe vegane | ✔ complet |
| **pinchofyum.com** | Pinch of Yum, rețete de zi cu zi | ✔ complet |
| **loveandlemons.com** | Love and Lemons, rețete vegetariene | ✔ complet |
| **cafedelites.com** | Cafe Delites, rețete rapide de familie | ✔ complet |

### Nu merg: blochează descărcarea automată

Aceste site-uri sunt foarte apreciate, dar refuză cererile care nu vin dintr-un browser obișnuit (coduri 402/403). Același refuz apare, foarte probabil, și de pe Home Assistant:

| Site | Răspuns |
| --- | --- |
| allrecipes.com, seriouseats.com, simplyrecipes.com | 402 (protecție anti-roboți) |
| budgetbytes.com, sallysbakingaddiction.com, cookieandkate.com, thekitchn.com, inspiredtaste.net, gimmesomeoven.com, skinnytaste.com | 403 (protecție anti-roboți) |

Idee pentru v1.5: **import din text lipit**. Copiezi rețeta din browser (unde site-ul se deschide normal), o lipești în Gustos și obții aceeași previzualizare editabilă. Așa ar merge și cu aceste site-uri.

---

## Ce trebuie adăugat în Gustos pentru rețetele în engleză (v1.5)

Testul a arătat că titlul, pașii, porțiile, timpii și poza ies corect. Lipsesc trei lucruri:

1. **Unități americane și britanice:**
   - azi, „2 cups flour” iese cu cantitatea 2, dar „cups” rămâne în denumire;
   - trebuie recunoscute: cup, tbsp / tablespoon, tsp / teaspoon, oz, lb, pinch, clove, stick (de unt);
   - ar fi utilă și conversia opțională în g / ml, plus °F → °C în pași.
2. **Traducerea** în română a titlului, ingredientelor, pașilor și sfaturilor, cu buton „Tradu în română” în previzualizare, cum prevede planul.
3. **Sugestia de categorie** pe cuvinte englezești: „soup” → Supe și ciorbe, „cake” → Deserturi etc.

---

© concept și realizare vlad39
