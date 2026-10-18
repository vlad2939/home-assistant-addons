# Manual de utilizare Gustos

Gustos este caietul tău de rețete. Rulează pe serverul din casă (Home Assistant) și se deschide în Chrome, de pe laptop, PC sau tabletă, în rețeaua locală.

## Pe scurt

- **Acasă** – rețetele adăugate recent, favoritele și o sugestie „Ce gătesc azi?”.
- **Rețete** – toate rețetele, cu căutare și filtre.
- **Adaugă** – o rețetă nouă, scrisă de tine.
- **Import** – o rețetă luată dintr-un link de pe un site permis.
- **Setări** – aspect, categorii, site-uri de import, backup, acest manual.

În stânga vezi categoriile. Pe tableta ținută vertical, ele se deschid cu butonul ☰ din stânga sus. Un click pe logo îl afișează mare; se închide cu ESC sau cu un click oriunde.

## Căutarea rețetelor

1. Deschide **Rețete** și scrie în câmpul mare de sus. Rezultatele apar pe măsură ce scrii.
2. Nu contează diacriticele sau literele mari: „taitei” găsește „tăiței”.
3. Căutarea se face în titlu, descriere, ingrediente și tag-uri. Dacă scrii mai multe cuvinte, rețeta trebuie să le conțină pe toate.
4. Filtrele se pot combina:
   - **Ingredient** – scrie primele litere și alege din listă. Poți alege mai multe ingrediente.
   - **Tag-uri** – bifează unul sau mai multe.
   - **Sursă** – un anumit site sau „Adăugate manual”.
   - **Doar favorite**.
   - **Categoria** – din lista din stânga.
5. **Sortare**: relevanță, adăugate recent, modificate recent, titlu sau timp total.
6. **Resetează filtrele** le șterge pe toate odată.

## Pagina unei rețete

- **Porții − / +** recalculează cantitățile. „la gust”, „un praf” sau „2-3” rămân neschimbate. **Revino la …** readuce numărul inițial de porții.
- Atinge un **ingredient** sau un **pas** ca să-l bifezi pe măsură ce gătești. Contorul (de exemplu 3/8) arată cât ai folosit, iar **Debifează tot** le resetează. Bifele rămân cât timp tab-ul e deschis.
- Butoane:
  - **♥** – adaugă sau scoate rețeta de la favorite;
  - **Editează** – deschide formularul rețetei;
  - **Șterge** – cere confirmare, apoi șterge definitiv rețeta, împreună cu poza.

## Adăugarea și editarea unei rețete

1. Apasă **Adaugă**, sau **Editează** pe pagina unei rețete.
2. **Poza**: **Alege poză** pentru un fișier sau **Fă o poză** pentru camera tabletei. Orientarea se corectează automat, iar locația din poză se șterge.
3. **Titlul** este singurul câmp obligatoriu.
4. **Ingredientele**:
   - În **Cantitate** poți scrie un număr („500”, „0,5”, „1 1/2”), care se scalează cu porțiile. Poți scrie și un text („2-3”, „un praf”), care rămâne neschimbat.
   - **Enter** adaugă un rând nou dedesubt.
   - **Adaugă grup** creează o secțiune separată, de exemplu „Pentru sos”.
   - Săgețile ↑ ↓ mută rândurile.
5. **Pașii** se mută tot cu săgeți. Dacă lipești toți pașii odată într-un câmp gol, fiecare rând devine un pas.
6. Apasă **Salvează rețeta**. Dacă încerci să pleci de pe pagină fără să salvezi, aplicația te avertizează.

## Importul dintr-un link

1. Copiază linkul rețetei din browser.
2. În **Import**, lipește linkul și apasă **Importă**.
3. Verifică **previzualizarea**: titlul, categoria sugerată, porțiile, ingredientele, pașii și poza. Corectează ce e nevoie.
4. Apasă **Salvează rețeta**. Poza se descarcă pe server abia acum.

Bine de știut:

- Se poate importa doar de pe site-urile din **Setări → Site-uri pentru import**.
- Multe site-uri scriu fără diacritice și nu trec numărul de porții. Completează porțiile ca să funcționeze scalarea.
- Dacă linkul a mai fost importat, aplicația te avertizează înainte să salvezi.

## Setări

- **Aspect** – temă automată (după sistem), luminoasă sau întunecată, și una din cele 5 culori de accent. Alegerea este aceeași pe toate dispozitivele.
- **Categorii** – adaugi, redenumești, ordonezi cu săgețile sau ștergi o categorie. O categorie care are rețete se poate șterge doar dacă alegi unde să fie mutate rețetele ei.
- **Site-uri pentru import** – adaugi un site nou (de exemplu „exemplu.ro”) sau activezi / dezactivezi unul existent.
- **Backup**:
  - **Exportă tot** descarcă un fișier ZIP cu toate rețetele și pozele. Fă un export după fiecare sesiune mare de adăugat rețete și păstrează fișierul într-un loc sigur.
  - **Restaurează din ZIP** înlocuiește toate datele curente cu cele din backup. Înainte de restaurare, aplicația salvează automat starea curentă ca „copie de siguranță”; ultimele 5 copii se pot descărca din aceeași secțiune.

Pe lângă exportul manual, datele intră automat în backup-urile Home Assistant (și în Google Drive Backup).

## Pe tabletă

- În Chrome: meniul ⋮ → **Adaugă pe ecranul principal**, ca să deschizi Gustos ca pe o aplicație.
- Pentru ecran complet pe laptop sau PC, apasă **F11**.

## Probleme frecvente

- **„Serverul nu răspunde”**:
  1. verifică dacă add-on-ul Gustos este pornit în Home Assistant (Setări → Aplicații → Gustos);
  2. verifică dacă dispozitivul e conectat la rețeaua de acasă.
- **Importul nu găsește ingredientele sau pașii**: site-ul și-a schimbat probabil formatul. Completează manual în previzualizare.
- **O poză nu se încarcă**: sunt acceptate JPG, PNG, WebP și HEIC, de maximum 15 MB.

---

© concept și realizare vlad39
