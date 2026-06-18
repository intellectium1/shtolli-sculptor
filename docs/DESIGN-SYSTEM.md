# Дизайн-система

Все значения определены как CSS custom properties в [`assets/css/tokens.css`](../assets/css/tokens.css)
— это единственный источник правды. Меняйте токен — меняется весь сайт.

## Направление

**Тёплый бронзовый / «литейный» люкс.** Кремовый фон, бронзовый акцент, тёмные
секции цвета чугуна. Контраст антиквенной serif-антиквы (Playfair Display) и
гуманистического гротеска (Manrope).

## Цвет

| Токен | HEX | Назначение |
|---|---|---|
| `--c-cream` | `#f6f2ec` | Фон страницы |
| `--c-cream-2` | `#fbf8f2` | Карточки / приподнятые поверхности |
| `--c-cream-3` | `#efe9df` | Утопленные поверхности |
| `--c-ink` | `#211d17` | Основной текст / тёмные секции |
| `--c-ink-soft` | `#3a342b` | Вторичный текст |
| `--c-muted` | `#5c554a` | Body-текст |
| `--c-faint` | `#837b6e` | Мета / подписи |
| `--c-bronze` | `#93673a` | Главный акцент |
| `--c-bronze-dark` | `#6e4d2b` | Нажатое состояние акцента |
| `--c-bronze-light` | `#cdb494` | Акцент на тёмном |
| `--c-on-dark` / `--c-on-dark-soft` / `--c-on-dark-faint` | `#f6f2ec` / `#e9e3d8` / `#9a9183` | Текст на тёмном |

Хайрлайны: `--line`, `--line-strong`, `--line-dark`. Плейсхолдер изображений
`--img-bg: #e7e0d3` (виден, пока картинка грузится — предотвращает «вспышку»).

> ⚠️ Контраст: бронза `#93673a` на кремовом используется для мелкого «кикера»
> (uppercase, bold). Соотношения и нюансы AA — в [ACCESSIBILITY.md](ACCESSIBILITY.md).

## Типографика

Два семейства:

- `--font-serif: 'Playfair Display'` — заголовки, цифры, акценты.
- `--font-sans: 'Manrope'` — интерфейс, body.

Адаптивная шкала на `clamp()` (масштабируется от мобильного к десктопу без медиазапросов):

| Токен | Диапазон | Применение |
|---|---|---|
| `--fs-hero` | `2.4rem → 4.5rem` | H1 hero (ограничен под длинные русские слова) |
| `--fs-h2` | `1.875rem → 3rem` | Заголовки секций |
| `--fs-h3` | `1.375rem → 1.65rem` | Карточки услуг |
| `--fs-display` | `2rem → 3.6rem` | CTA / контакты |
| `--fs-lead` | `1rem → 1.125rem` | Вводные абзацы |
| `--fs-kicker` | `0.78rem` | Надзаголовки (uppercase, `letter-spacing:.24em`) |

Высоты строк: `--lh-tight: 1.04` (hero), `--lh-snug: 1.14` (H2), `--lh-body: 1.7`.

## Отступы и сетка

- `--space-section: clamp(4.5rem, 3rem + 6vw, 9rem)` — вертикальные отступы секций.
- `--gutter: clamp(1.25rem, 0.5rem + 3vw, 2rem)` — боковые поля.
- `--maxw: 1240px` — максимальная ширина контента (`.container`).
- `--nav-h: 74px` (64px на мобильном).

## Радиусы и тени

`--radius-sm: 2px`, `--radius: 3px`, `--radius-lg: 4px`. Тени мягкие, тёплые
(оттенок `rgba(40,28,14,…)`): `--shadow-card`, `--shadow-img`, `--shadow-float`.

## Моушен-токены

```css
--ease-out-expo: cubic-bezier(0.16, 0.84, 0.34, 1);  /* основной */
--ease-out-soft: cubic-bezier(0.22, 1, 0.36, 1);
--dur-fast: 0.25s;  --dur: 0.4s;  --dur-slow: 0.9s;
```

## Компоненты (выдержка)

| Класс | Описание |
|---|---|
| `.btn` + `--solid` / `--ghost` / `--bronze` + `--lg` / `--xl` / `--block` | Кнопки. Цвет через локальные `--btn-bg/--btn-fg` |
| `.nav`, `.nav__link`, `.nav__burger`, `.mobile-menu` | Навигация + мобильное меню |
| `.hero`, `.eyebrow`, `.hero__main/__detail`, `.hero__scroll` | Hero |
| `.marquee`, `.marquee__item/__dot` | Бегущая строка |
| `.stat`, `.stat__num` | Счётчики |
| `.service-card` | Карточка услуги |
| `.project-row`, `.project-preview` | Список проектов + плавающее превью |
| `.gallery__masonry/__item/__frame/__cap` | Галерея |
| `.cta`, `.cta__ring` | CTA-баннер |
| `.footer`, `.contact-line`, `.chip`, `.form` | Футер, контакты, форма |
| `.lightbox` | Просмотрщик работ |

Именование: компоненты — kebab/BEM (`.service-card__title`), утилиты — короткие
(`.kicker`, `.lead`, `.h2`). Состояния — префикс `is-` (`.is-open`, `.is-stuck`, `.is-active`).
