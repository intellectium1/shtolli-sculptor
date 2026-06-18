# Деплой и хостинг

Сайт статический — деплой сводится к загрузке файлов. Сборка не нужна.

## Что загружать

Всю папку проекта **кроме** служебного (по желанию можно не выкладывать):

```
index.html
assets/            ← css, js, img (оптимизированные webp)
# опционально не нужны на проде:
img/               ← исходные изображения (тяжёлые; нужны только для пересжатия)
docs/  Штолли.dc.html  .claude/  *.py
```

> Минимальный прод-набор: `index.html` + `assets/`.

## Варианты хостинга

### Netlify / Vercel (drag-and-drop)
1. Перетащить папку в дашборд — готово. Либо подключить git-репозиторий, build
   command пустой, publish directory — корень.

### GitHub Pages
1. Запушить в репозиторий, Settings → Pages → Branch `main` / `root`.
2. Сайт на `https://<user>.github.io/<repo>/`. Пути относительные — работает из подпапки.

### Обычный сервер (nginx / Apache / любой shared-хостинг)
1. Скопировать файлы в корень сайта (`/var/www/shtolli` и т.п.).

Пример `nginx` с кэшем и сжатием:

```nginx
server {
  listen 443 ssl http2;
  server_name shtolli.ru;
  root /var/www/shtolli;
  index index.html;

  # Сжатие
  gzip on;
  gzip_types text/css application/javascript image/svg+xml;

  # Кэш статики (картинки/css/js — с хэшем меняем имя при обновлении)
  location ~* \.(webp|jpg|png|css|js|woff2)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
  }

  # Безопасные заголовки
  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

## Self-hosting библиотек (убрать зависимость от CDN)

По умолчанию GSAP/Lenis/шрифты тянутся с CDN — это требует интернета и сторонних
доменов. Чтобы захостить локально:

1. Скачать в `assets/vendor/`:
   - `gsap.min.js`, `ScrollTrigger.min.js`, `SplitText.min.js` (gsap 3.15)
   - `lenis.min.js`, `lenis.css` (lenis 1.3.23)
2. В `index.html` заменить CDN-URL на локальные пути:
   ```html
   <link rel="stylesheet" href="assets/vendor/lenis.css">
   <script defer src="assets/vendor/lenis.min.js"></script>
   <script defer src="assets/vendor/gsap.min.js"></script>
   <script defer src="assets/vendor/ScrollTrigger.min.js"></script>
   <script defer src="assets/vendor/SplitText.min.js"></script>
   ```
3. Шрифты: скачать Playfair Display + Manrope (woff2), положить в `assets/fonts/`,
   заменить `<link>` Google Fonts на `@font-face` с `font-display:swap` и добавить
   `<link rel="preload" as="font" type="font/woff2" crossorigin>` для критичных
   начертаний.

## SRI (Subresource Integrity) для CDN

Если остаётесь на CDN — добавьте `integrity` + `crossorigin` к `<script>`, чтобы
защититься от подмены файла на CDN:

```html
<script defer src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"
        integrity="sha384-…" crossorigin="anonymous"></script>
```

Хэши берутся со страницы пакета на jsdelivr (кнопка SRI) или командой
`openssl dgst -sha384 -binary file.js | openssl base64 -A`.

## Контент-безопасность (CSP) — опционально

Если нужен жёсткий CSP, разрешите источники, которые реально используются:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com;
  style-src  'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com;
  font-src   'self' https://fonts.gstatic.com;
  img-src    'self' data:;
  connect-src 'self';
```

> `'unsafe-inline'` нужен из-за inline-скрипта прогрессивного улучшения в `<head>`
> и инлайновых стилей. Для строгого CSP вынесите inline-скрипт в файл и используйте
> nonce. Для статики средней критичности приведённого выше достаточно.

## Подключить реальную отправку формы

Сейчас форма собирает `mailto:` (бэкенда нет). Варианты «боевой» отправки —
[CONTENT-GUIDE.md → Форма](CONTENT-GUIDE.md#форма).

## Чек-лист перед публикацией

- [ ] HTTPS включён, есть HSTS.
- [ ] Проверены ссылки: tel/mailto/Telegram/WhatsApp/`shtolli.ru/*`.
- [ ] (Если CDN) добавлены SRI-хэши.
- [ ] Прогнан Lighthouse (см. [PERFORMANCE.md](PERFORMANCE.md)).
- [ ] Открыт с включённым «Reduce motion» — контент читается, анимаций нет.
- [ ] Проверено без JS (DevTools → disable JS) — контент виден, навигация работает.
