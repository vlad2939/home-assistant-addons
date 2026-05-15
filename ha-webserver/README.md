# Full Web Server Add-on

Acest add-on instalează un server web NGINX complet și servește automat fișierele din folderul `/share/webserver` al instanței tale Home Assistant (ideal pentru dispozitive x86_64 precum Intel NUC).

## Funcționalități

* **Autoconfigurare Folder:** Dacă directorul `/share/webserver` nu există la prima pornire, add-on-ul îl va crea automat.
* **Autoindexare:** Dacă nu ai un fișier `index.html` în foldere/subfoldere, serverul web va afișa o listă frumos formatată cu fișierele disponibile (ideal pentru server de fișiere/download-uri).
* **Compresie Gzip:** Viteze rapide de încărcare a site-ului din rețeaua ta.
* **Securitate:** Fișierele ascunse (ex. `.htaccess`) sunt blocate automat din a fi afișate public.

## Configurare

În pagina de configurare a add-on-ului (din Home Assistant):

```yaml
ports:
  80/tcp: 8080
```
Poți modifica `8080` cu orice alt port de destinație dorești pentru rețeaua ta locală (cum ar fi direct `80` dacă nu intră în conflict cu altceva).

## Cum accesez?
* Interfață web: Deschide `http://<IP_HOME_ASSISTANT>:8080`
* Dacă ești pe NUC-ul local sau accesezi în browser, asigură-te că Home Assistant rulează și folosești portul mapat.
