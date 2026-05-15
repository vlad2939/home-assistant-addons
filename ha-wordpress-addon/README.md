# Home Assistant Add-on: WordPress Full Option

[![Supports aarch64 Architecture][aarch64-shield]][aarch64] [![Supports amd64 Architecture][amd64-shield]][amd64]

**Instalează WordPress complet, cu PHP 8.2 și Nginx. Servește datele și fișierele nativ din folderul /share/wordpress din Home Assistant.**

---

## 📖 About (Despre)

Acest Add-on a fost creat pentru sistemele Home Assistant (Supervised / Home Assistant OS).
Oferă o instalare completă de WordPress folosind **Nginx** și **PHP 8.2**.

### 🚀 Cum funcționează?
- La prima pornire, add-on-ul verifică automat directorul `/share/wordpress`.
- Dacă WordPress nu este instalat, descarcă automat ultima versiune și o dezarhivează.
- Folosind variabilele din fila **Configuration**, configurează fișierul `wp-config.php` pentru conectarea la baza de date. 
- Interfața web este servită fluid prin serverul _Nginx_ + _PHP-FPM_.

---

## 💾 Persistență date

Directorul `/share/wordpress` din interfața nativă de Home Assistant (SMB/Samba/File editor) acționează ca Host pentru toate fișierele.
- **Teme și Plugin-uri:** Orice ai instala va rămâne salvat pe discul intern.
- **Media (Uploads):** Fișierele sunt persistente chiar și dacă oprești, repornești sau reconstruiești Add-on-ul. 
- **Baza de Date:** Se păstrează separat (vezi Add-on-ul oficial MariaDB).

---

## ⚙️ Configurare Add-on

```yaml
db_host: "core-mariadb"
db_user: "wordpress"
db_password: "parola_setata_in_mariadb"
db_name: "wordpress"
```

- **`db_host`**: Host-ul bazei de date. Implicit `core-mariadb` dacă folosești add-on-ul oficial.
- **`db_user`**: Utilizatorul bazei de date creat pentru WordPress.
- **`db_password`**: Parola aleasă pentru acel utilizator.
- **`db_name`**: Numele bazei de date.

> **Notă:** Limita implicită pentru upload file size via web în Nginx / PHP (client_max_body_size) pentru acest Add-on este setată la **256M**. Această setare previne erorile apărute când încerci să instalezi dintr-o arhivă .zip teme premium foarte mari sau când folosești pluginuri de back-up / migrare cum ar fi 'All-in-One WP Migration'.

---

[aarch64-shield]: https://img.shields.io/badge/aarch64-yes-green.svg
[aarch64]: https://home-assistant.io
[amd64-shield]: https://img.shields.io/badge/amd64-yes-green.svg
[amd64]: https://home-assistant.io
