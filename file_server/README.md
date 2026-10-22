# File Server

Addon Home Assistant pentru gestionarea fișierelor din rețeaua locală, printr-o interfață responsive inspirată de manager-ele desktop de fișiere.

## Acces

După instalare și pornire, accesează din Chrome:

```text
http://IP-UL-HOME-ASSISTANT:8085
```

Addon-ul nu solicită parolă. Orice dispozitiv care poate accesa portul `8085` poate încărca, descărca sau șterge fișiere.

## Funcții

- navigare prin foldere;
- încărcare de fișiere multiple și foldere (Chrome);
- creare de foldere;
- descărcare de fișiere sau foldere ca arhive ZIP;
- ștergerea fișierelor și folderelor, cu confirmare;
- descărcarea elementelor selectate ca arhivă ZIP;
- mutarea elementelor selectate în foldere existente, fără suprascrierea destinațiilor;
- teme deschisă și închisă, memorate în browser;
- cinci culori de accent armonizate cu tema, cu alegerea memorată în browser;
- vizualizare listă sau grilă, căutare în folderul curent, sortare și ștergere multiplă;
- progres, viteză și anulare pentru transferurile de fișiere;
- cotă maximă de 15 GB, verificată la server, cu indicator pentru spațiul folosit și liber;
- folderele se deschid la dublu-click; fișierele compatibile se previzualizează în aplicație, iar celelalte rămân disponibile prin butonul de descărcare;
- preview pentru PDF, imagini, audio, video și fișiere text/cod uzuale; imaginile au zoom și rotire, audio/video au controale de redare, iar audio poate continua în mini-player;
- navigare înainte/înapoi în lista media a folderului și redarea consecutivă a elementelor cu butonul „Redă media”;
- previzualizare PDF încorporată și afișare text sigură pentru HTML, cod și documente text; arhivele nu se deschid la dublu-click;
- logo-ul din bara laterală se poate deschide pe tot ecranul și se închide cu `Esc` sau click.

Fișierele sunt păstrate în `/share/file_server` și rămân disponibile la repornirea ori actualizarea addon-ului. Pentru depanare în afara Home Assistant, directorul poate fi suprascris prin variabila `DATA_DIR`.

Limita de 15 GB se aplică totalului fișierelor obișnuite din acest director și subdirectoarele lui. Fișierele simbolice nu sunt acceptate și nu se includ în total.
