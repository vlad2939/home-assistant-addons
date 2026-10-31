# File Server

Un spațiu de fișiere privat pentru rețeaua locală, administrat din browser și găzduit de Home Assistant. Interfața este optimizată pentru Chrome pe Windows și păstrează datele separat de containerul addonului.

> **Notă de acces:** addonul nu folosește parolă. Orice dispozitiv care poate ajunge la portul său în rețeaua locală poate gestiona fișierele.

## Acces rapid

Deschide în Chrome:

```text
http://IP-UL-HOME-ASSISTANT:8085
```

Înlocuiește `IP-UL-HOME-ASSISTANT` cu adresa IP locală a serverului Home Assistant.

## Ce poți face

### Fișiere și foldere

- Navighează prin directoare, folosește breadcrumb-ul sau butonul **Back** pentru a urca spre rădăcină.
- Încarcă unul sau mai multe fișiere, ori un folder întreg din Chrome.
- Creează directoare, mută selecții în alte directoare și descarcă fișiere sau arhive ZIP.
- Redenumește fișiere și foldere din meniul contextual sau cu `F2`.
- Copiază unul sau mai multe elemente într-un folder existent. Dacă un nume este deja folosit, se creează automat o copie cu sufixul `(copie)`.
- Șterge fișiere și foldere cu confirmare. La încărcarea peste un fișier existent, aplicația cere confirmarea înlocuirii.
- Caută în folderul curent sau activează **Tot spațiul** pentru a găsi fișiere și foldere în toate directoarele. Căutarea globală cere cel puțin două caractere și afișează cel mult 1.000 de potriviri.
- Sortează elementele și alege vizualizarea listă sau grilă.
- Click selectează un element; `Ctrl`/`⌘` adaugă sau elimină din selecție, iar `Shift` selectează un interval. Dublu-click deschide folderul sau preview-ul.
- Click dreapta deschide meniul contextual cu preview/deschidere, descărcare, redenumire, copiere, mutare, ștergere și acțiuni de selecție.

### Previzualizare și redare

Dublu-click pe un fișier deschide fereastra de preview. Dacă formatul nu poate fi afișat de Chrome, fereastra explică acest lucru și oferă butonul **Descarcă**.

- **Imagini:** navigare anterior/următor, zoom și rotire.
- **PDF și documente text/cod uzuale:** afișare în fereastră și navigare între documentele din folder.
- **Audio și video:** redare cu controalele Chrome; audio poate continua în mini-player.
- **Arhive și formate incompatibile:** fără preview; fișierul rămâne disponibil pentru descărcare.

Compatibilitatea audio/video depinde și de codec-urile instalate și acceptate de Chrome.

### Transferuri și spațiu

- Panoul **Transferuri** indică progresul și viteza pentru încărcări și descărcări.
- Fișierele de peste **2 GB** se descarcă prin fluxul nativ Chrome. Interfața nu le acumulează ca Blob în memoria paginii; progresul este raportat de server. Anularea se face din lista de descărcări Chrome.
- Cota este de **15 GB** pentru totalul fișierelor din directorul addonului. Indicatorul din bara laterală arată spațiul folosit și disponibil.
- Tema și culoarea de accent sunt alese local și memorate în browser.

## Stocare și backup

Datele sunt păstrate în:

```text
/share/file_server
```

Directorul rămâne disponibil după repornirea și actualizarea addonului. Configurația addonului exclude `share/file_server/*` din backup-urile Home Assistant; păstrează o copie separată dacă dorești backup pentru aceste fișiere.

Limita de stocare este verificată de server la încărcare. Linkurile simbolice nu sunt acceptate și nu sunt incluse în calculul cotei.

## Instalare și actualizare

1. Adaugă repository-ul `vlad2939/home-assistant-addons` în magazinul de addon-uri Home Assistant, dacă nu este deja adăugat.
2. Instalează **File Server** din magazin și pornește addonul.
3. Deschide `http://IP-UL-HOME-ASSISTANT:8085` dintr-un dispozitiv din rețeaua locală.
4. Pentru o versiune nouă, reîncarcă lista de addon-uri, apoi folosește **Actualizare** din pagina addonului.

## Depanare

- **Pagina nu se încarcă:** verifică dacă addonul rulează, dacă IP-ul Home Assistant este corect și dacă portul `8085` este disponibil în rețea.
- **Un format nu se deschide:** folosește butonul **Descarcă** din fereastra de preview; redarea video/audio depinde de suportul Chrome pentru format și codec.
- **Încărcarea este refuzată:** verifică spațiul liber din cota de 15 GiB și numele/calea destinației.
- **Transfer mare:** lasă Chrome deschis până se termină descărcarea; urmărește progresul în aplicație sau în lista de descărcări Chrome.

## Detalii tehnice

- **Versiune:** `2.3.0`
- **Port:** `8085/tcp`
- **Arhitectură:** `amd64`
- **Director persistent:** `/share/file_server`
- **Fișiere principale:** `server.js`, `public/`, `config.yaml`, `Dockerfile`, `run.sh`

Pentru depanare în afara Home Assistant, directorul de date poate fi suprascris cu variabila de mediu `DATA_DIR`.
