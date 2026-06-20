# Деплой на хостинг рег.ру

Полное руководство по публикации сайта мастерской ШТОЛЛИ на хостинге рег.ру.
Сайт — статический (HTML/CSS/JS), без серверной части. Требования минимальны.

---

## 1. Структура файлов для загрузки

Загрузите на хостинг **все** файлы из корневой папки проекта:

```
/ (корень сайта — www или public_html)
├── index.html              ← главная страница
├── quiz.html               ← квиз: первичная заявка за 4 вопроса
├── blog.html               ← страница блога
├── sitemap.xml             ← карта сайта (для поисковиков)
├── robots.txt
├── blog/
│   ├── lityo-bronzy.html
│   ├── patinirovanie.html
│   ├── 3d-modelirovanie.html
│   ├── portretnyy-barelyef.html
│   └── materialy-dlya-litya.html
├── services/
│   ├── sculpture.html      ← изготовление скульптур
│   ├── lityo.html          ← художественное литьё
│   └── uslugi.html         ← услуги скульптора
├── assets/
│   ├── css/
│   │   ├── tokens.css
│   │   ├── base.css
│   │   ├── components.css
│   │   ├── additions.css   ← многостраничные блоки, bottom-nav, слайдер
│   │   ├── polish.css      ← визуальные эффекты, продающие механики
│   │   └── quiz.css        ← стили квиза
│   ├── js/
│   │   ├── ui.js
│   │   ├── motion.js
│   │   ├── slider.js       ← слайдер проектов
│   │   ├── polish.js       ← floating CTA, sticky bar, tilt-эффект
│   │   └── quiz.js         ← логика квиза
│   └── img/
│       ├── _manifest.json
│       ├── art-*.webp      ← иллюстрации для статей блога
│       └── *.webp          ← оптимизированные изображения работ
├── optimize_imgs.py        (скрипт оптимизации — можно не загружать)
└── docs/                   (документация — можно не загружать)
```

> **Важно:** загрузите папку `services/` и файл `quiz.html` целиком — на&nbsp;них
> ведут ссылки из&nbsp;меню, hero и&nbsp;карточек услуг. Без них будут 404.

**Корневая папка на рег.ру:** обычно `www` или `public_html`. Зависит от типа аккаунта.

---

## 2. Выбор тарифа рег.ру

Для статического сайта достаточно **минимального тарифа виртуального хостинга**.

| Параметр | Требование | Рег.ру тариф |
|---|---|---|
| PHP / Node.js | Не нужны | Любой (даже «Старт») |
| Место на диске | ~4 МБ (img) + ~1 МБ (код) | Любой |
| SSL-сертификат | Обязателен (HTTPS) | Let's Encrypt — бесплатно |
| Nginx / Apache | Любой | Любой |
| База данных | Не нужна | — |

Рекомендуем тариф **«Оптимальный»** — включает SSL, поддерживает `.htaccess`, есть кэш-заголовки.

---

## 3. Загрузка файлов

### Способ 1: Файловый менеджер (в браузере)

1. Зайдите в панель управления рег.ру → раздел **«Файлы»** → **«Файловый менеджер»**.
2. Перейдите в папку `www` (или `public_html`).
3. Загрузите архив `shtolli.zip` кнопкой «Загрузить».
4. Разархивируйте прямо в файловом менеджере.
5. Убедитесь, что `index.html` лежит непосредственно в `www/`, а не в `www/shtolli/`.

### Способ 2: FTP/SFTP (FileZilla)

```
Хост:     ftp.shtolli.ru  (или IP-адрес сервера из ЛК рег.ру)
Порт:     21 (FTP) / 22 (SFTP)
Имя:      логин FTP из личного кабинета
Пароль:   пароль FTP из личного кабинета
```

Загрузите содержимое папки проекта в удалённую директорию `www/`.

### Способ 3: SSH + rsync (наиболее надёжный)

```bash
# Загрузить только нужные файлы, исключить документацию и скрипты оптимизации
rsync -avz \
  --exclude 'docs/' \
  --exclude 'optimize_imgs.py' \
  --exclude '*.py' \
  --exclude '.git/' \
  --exclude '.claude/' \
  ./ user@shtolli.ru:~/www/
```

Доступ по SSH запрашивается в панели рег.ру → «Управление» → «SSH».

---

## 4. Настройка домена

1. В ЛК рег.ру → **«Домены»** → нажмите на `shtolli.ru`.
2. Убедитесь, что DNS-записи указывают на IP хостинга рег.ру (A-запись).
3. В разделе **«Хостинг»** → **«Домены»** — добавьте `shtolli.ru` и `www.shtolli.ru` как основной домен.
4. Настройте редирект `www → без www` (или наоборот) для избежания дублей в поисковиках.

---

## 5. SSL-сертификат (HTTPS) — обязательно

1. Панель рег.ру → **«Хостинг»** → **«SSL-сертификаты»**.
2. Нажмите **«Заказать Let's Encrypt»** — бесплатно, автопродление.
3. Дождитесь активации (обычно до 15 минут).
4. Проверьте: откройте `https://shtolli.ru` в браузере — замок должен гореть.

---

## 6. Файл `.htaccess` — кэш, gzip, редиректы

Создайте файл `.htaccess` в корне сайта (`www/.htaccess`) со следующим содержимым:

```apache
# --- Сжатие ---
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/css application/javascript
    AddOutputFilterByType DEFLATE image/svg+xml application/json
</IfModule>

# --- Кэш для статических ресурсов ---
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/html              "access plus 1 hour"
    ExpiresByType text/css               "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType image/webp             "access plus 6 months"
    ExpiresByType image/svg+xml          "access plus 1 month"
    ExpiresByType application/json       "access plus 1 day"
</IfModule>

# --- Cache-Control заголовки ---
<IfModule mod_headers.c>
    <FilesMatch "\.(css|js)$">
        Header set Cache-Control "public, max-age=2592000, immutable"
    </FilesMatch>
    <FilesMatch "\.(webp|png|jpg|jpeg|gif|svg|ico)$">
        Header set Cache-Control "public, max-age=15552000"
    </FilesMatch>
</IfModule>

# --- HTTPS редирект ---
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]

    # www → без www (или наоборот — выберите одно)
    RewriteCond %{HTTP_HOST} ^www\.(.+)$ [NC]
    RewriteRule ^ https://%1%{REQUEST_URI} [R=301,L]
</IfModule>

# --- Страница 404 ---
ErrorDocument 404 /index.html

# --- Запрет листинга директорий ---
Options -Indexes

# --- Скрыть .htaccess и служебные файлы ---
<FilesMatch "^\.">
    Order allow,deny
    Deny from all
</FilesMatch>
<FilesMatch "\.(py|md|json)$">
    <Files "_manifest.json">
        Allow from all
    </Files>
    Order allow,deny
    Deny from all
</FilesMatch>
```

> **Важно:** Файл `_manifest.json` оставьте доступным — он нужен для работы слайдера.
> Файлы `*.py` и документацию `docs/` на хостинг не загружайте — они там не нужны.

---

## 7. Sitemap и robots.txt

Создайте два файла в корне:

### `sitemap.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://shtolli.ru/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://shtolli.ru/blog.html</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://shtolli.ru/blog/lityo-bronzy.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://shtolli.ru/blog/patinirovanie.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://shtolli.ru/blog/3d-modelirovanie.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://shtolli.ru/blog/portretnyy-barelyef.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://shtolli.ru/blog/materialy-dlya-litya.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>
```

### `robots.txt`

```
User-agent: *
Allow: /
Disallow: /docs/

Sitemap: https://shtolli.ru/sitemap.xml
```

---

## 8. Регистрация в Яндекс.Вебмастер и Google Search Console

### Яндекс.Вебмастер
1. Откройте [webmaster.yandex.ru](https://webmaster.yandex.ru).
2. Добавьте сайт `shtolli.ru`.
3. Подтвердите через HTML-файл или DNS-запись.
4. После подтверждения: **«Индексирование»** → **«Sitemap-файлы»** → добавьте `https://shtolli.ru/sitemap.xml`.

### Google Search Console
1. Откройте [search.google.com/search-console](https://search.google.com/search-console).
2. Добавьте ресурс, подтвердите через DNS или HTML-файл.
3. Отправьте Sitemap: **«Файлы Sitemap»** → вставьте URL → «Отправить».

---

## 9. Чек-лист перед запуском

```
[ ] Все файлы загружены в www/ (index.html в корне, не в папке)
[ ] Открывается https://shtolli.ru/ — замок горит
[ ] Редирект http → https работает
[ ] Все картинки загружаются (нет 404 на .webp файлы)
[ ] blog.html открывается по https://shtolli.ru/blog.html
[ ] Все 5 статей блога открываются (blog/lityo-bronzy.html, etc.)
[ ] .htaccess загружен и работает (проверьте заголовки в DevTools → Network)
[ ] sitemap.xml доступен по https://shtolli.ru/sitemap.xml
[ ] robots.txt доступен по https://shtolli.ru/robots.txt
[ ] Яндекс.Вебмастер — sitemap подтверждён и принят
[ ] Google Search Console — sitemap отправлен
[ ] Мобильная версия: сайт открывается корректно (bottom-nav видна)
[ ] Контактная форма отправляет (проверьте mailto-сборку в ui.js)
```

---

## 10. Обновление сайта

При внесении правок достаточно:

1. Отредактировать нужный файл локально.
2. Загрузить его поверх старого через FTP/файловый менеджер.

При изменении CSS/JS-файлов браузеры могут кэшировать старую версию. Для принудительного обновления кэша — добавьте query-параметр к ссылке на файл:

```html
<!-- было -->
<link rel="stylesheet" href="assets/css/additions.css">

<!-- стало (v2 — обновленная версия) -->
<link rel="stylesheet" href="assets/css/additions.css?v=2">
```

---

## 11. Форма обратной связи

Текущая реализация собирает данные формы и открывает `mailto:` ссылку (нет серверной части). Это работает на всех хостингах без настройки.

Если потребуется отправка через SMTP с уведомлением на email — потребуется PHP-скрипт (`mail.php`) или интеграция с формсервисом (Formspree, EmailJS). Это выходит за рамки текущей реализации.

---

## Поддержка

При проблемах с загрузкой или работой сайта:
- Email мастерской: `shtolik@list.ru`
- Тех. поддержка рег.ру: [reg.ru/support](https://www.reg.ru/support/)
- Документация рег.ру по FTP: [reg.ru/support/hosting/ftp](https://www.reg.ru/support/hosting/ftp)

---

## 12. Автоотправка заявок на e-mail (Formspree)

По умолчанию форма и квиз работают в ручном режиме (WhatsApp/Telegram/почта) и
сохраняют заявки в `/admin.html`. Чтобы заявки приходили на почту **автоматически**:

1. Зарегистрируйтесь на [formspree.io](https://formspree.io), создайте форму на адрес
   `shtolik@list.ru` (бесплатный тариф — 50 заявок/мес).
2. Скопируйте endpoint формы вида `https://formspree.io/f/xxxxxxxx`.
3. Откройте `assets/js/config.js` и вставьте его в строку:
   `window.SHTOLLI_FORMSPREE = 'https://formspree.io/f/xxxxxxxx';`
4. Загрузите изменённый `config.js` на хостинг.

После этого при отправке формы/квиза заявка уходит на почту в фоне, пользователю
показывается «Заявка отправлена ✓». Если Formspree недоступен — автоматически
включается прежний ручной фолбэк (мессенджеры/почта), ничего не теряется.

> Альтернатива — **EmailJS**: тогда в `config.js` замените тело `ShtolliSend`
> на вызов `emailjs.send(...)` (интерфейс — `Promise<boolean>`).

## 13. Безопасность сторонних скриптов (SRI)

CDN-скрипты (GSAP, Lenis) подключены с атрибутами `integrity="sha384-…"` и
`crossorigin="anonymous"` — браузер проверяет контрольную сумму файла и не выполнит
его при подмене на CDN. Версии зафиксированы (`gsap@3.15.0`, `lenis@1.3.23`).
**При обновлении версии библиотеки пересчитайте хеш**, иначе скрипт перестанет
грузиться:
```bash
curl -fsSL <URL> | openssl dgst -sha384 -binary | openssl base64 -A
```
