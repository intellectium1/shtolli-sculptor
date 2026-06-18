# Руководство по контенту

Как редактировать сайт без знания фреймворков. Почти всё — правка `index.html` и
картинок в `assets/img/`.

## Изображения

### Как добавить/заменить изображение
1. Положите исходник в `img/` (любой размер; webp/jpg/png).
2. Пропишите его в карте `MAP` внутри `optimize_imgs.py` (исходное_имя → слаг, макс_сторона).
3. Запустите пересжатие:
   ```bash
   python optimize_imgs.py     # перезапишет assets/img/<слаг>.webp и _manifest.json
   ```
   Скрипт делает: коррекцию EXIF-поворота, ресайз по большей стороне, экспорт в webp q82.
4. Подставьте `assets/img/<слаг>.webp` в нужный `<img>` (см. ниже) и обновите
   `width`/`height` под новые размеры из `assets/img/_manifest.json`.

> Зачем: исходники тяжёлые (до 2.4 МБ). Пересжатие дало 13.3 МБ → 3.2 МБ. Подробности —
> [PERFORMANCE.md](PERFORMANCE.md).

### Где какие изображения
| Слот | Слаг | Где в HTML |
|---|---|---|
| Главное фото hero | `hero-main` | секция `#top`, `fetchpriority="high"` |
| Деталь hero (бронза) | `hero-detail` | секция `#top` |
| Фото «О мастерской» | `about-master` | секция `#about` |
| Галерея (22 шт.) | `morskoy-konek`, `nikolay`, … | секция `#gallery` |
| Превью проектов | `pero`, `nagrady`, `proj-vesy`, `nikolay`, `byust` | атрибут `data-preview` строк |

## Галерея

Каждая работа — блок `<figure class="gallery__item">` в `#gallery-grid`. Шаблон:

```html
<figure class="gallery__item" data-reveal data-lightbox style="--ar:.75">
  <button type="button" class="gallery__btn" aria-label="Открыть работу: НАЗВАНИЕ">
    <span class="gallery__frame">
      <img src="assets/img/СЛАГ.webp" width="1050" height="1400"
           alt="ОПИСАНИЕ работы — материал, размер" loading="lazy" decoding="async">
    </span>
  </button>
  <figcaption class="gallery__cap">
    <span class="gallery__name">НАЗВАНИЕ</span>
    <span class="gallery__material">Материал · размер</span>
  </figcaption>
</figure>
```

- `--ar` — пропорции рамки (ширина/высота). Возьмите из `_manifest.json` (`ar`), чтобы
  не было обрезки. Напр. фото 1050×1400 → `--ar:.75`.
- `alt` — осмысленное описание (важно для доступности и SEO).
- Lightbox подхватывает новые работы автоматически (строит список из DOM).

Удалить работу — удалить её `<figure>`. Порядок в галерее = порядок в HTML.

## Услуги

Три карточки `<a class="service-card">` в секции `#services`. Меняйте номер
(`service-card__num`), заголовок, описание, цену (`service-card__price`) и ссылку `href`.

## Избранные проекты

Строки `<li class="project-row" data-preview="assets/img/СЛАГ.webp">` в `#projects-list`.
- `data-preview` — картинка, которая всплывает у курсора при наведении (desktop).
- Меняйте номер, заголовок (`project-row__title`), мета (`project-row__meta`).

## Счётчики статистики

В секции `#about`, блок `.stats`. Анимируемое число — в `data-count`
(`data-count-decimals` — знаков после запятой):

```html
<span data-count="2.5" data-count-decimals="1">0</span><span class="stat__unit"> м</span>
```

## Бегущая строка (материалы)

`#marquee-track .marquee__group` — список `<span class="marquee__item">…</span>`,
разделённых `<span class="marquee__dot"></span>`. JS клонирует группу для бесшовности —
правьте только одну группу.

## Контакты

Меняются в двух местах (футер `#contacts` и ссылки в шапке/CTA):
- Телефон: `href="tel:+79384499311"` и видимый текст.
- Почта: `href="mailto:shtolik@list.ru"`.
- Telegram: `https://t.me/shtoll`. WhatsApp: `https://wa.me/79384499311`.
- Адрес: текст в `.contact-line`.
- Также обновите блок `application/ld+json` (Schema.org) в `<head>` и `og:*`-мета.

## Форма

Бэкенда нет — по сабмиту форма валидируется, показывает успех и открывает `mailto:`
с заполненным письмом. Чтобы подключить реальную отправку, в `ui.js` (функция `form`)
замените блок `mailto` на один из:

- **Formspree** (без сервера): `fetch('https://formspree.io/f/XXXX', {method:'POST', body:new FormData(formEl)})`.
- **Telegram-бот**: `fetch('https://api.telegram.org/bot<TOKEN>/sendMessage', …)` —
  но токен нельзя светить в клиенте; используйте свой прокси-эндпойнт.
- **Свой бэкенд**: `fetch('/api/lead', {method:'POST', …})`.

> Не храните секреты (токены ботов, ключи) в клиентском JS.

## Тексты, заголовок, SEO

- `<title>`, `<meta name="description">`, `og:*` — в `<head>` `index.html`.
- Заголовки секций — `<h2 class="h2">`; не пропускайте уровни (h1 → h2 → h3).
- `<html lang="ru">` — менять при локализации.
