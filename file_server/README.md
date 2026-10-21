# File Server

Addon Home Assistant pentru gestionarea fișierelor din rețeaua locală, printr-o interfață web simplă.

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
- teme deschisă și închisă, memorate în browser.

Fișierele sunt păstrate în `/share/file_server` și rămân disponibile la repornirea ori actualizarea addon-ului. Pentru depanare în afara Home Assistant, directorul poate fi suprascris prin variabila `DATA_DIR`.
