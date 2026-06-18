# Архитектура

## Принципы

1. **Прогрессивное улучшение.** Базовый контент — семантический HTML, видимый без
   JS. Моушен — слой поверх, который безопасно отключается.
2. **Разделение ответственности.** `ui.js` — интеракции, не требующие анимационной
   библиотеки. `motion.js` — всё, что зависит от GSAP/Lenis. CSS разбит на токены /
   базу / компоненты.
3. **Отказоустойчивость.** Если GSAP не загрузился — сайт остаётся рабочим (контент
   показывается, скролл нативный). Если у пользователя `prefers-reduced-motion` —
   анимации не запускаются.
4. **Без скрытого dead-state.** Начальные «спрятанные» состояния для reveal
   применяются ТОЛЬКО под `html.js`. Нет JS → ничего не спрятано.

## Поток инициализации

```
HTML парсится
  └─ <script> в <head> (синхронный, до отрисовки):
        html.no-js → html.js   (+ html.reduce-motion если задано в ОС)
        => CSS reveal-состояний (opacity:0) активируется ТОЛЬКО сейчас
  └─ CSS (tokens → base → components) — render-blocking, без FOUC
  └─ defer-скрипты в порядке: Lenis → GSAP → ScrollTrigger → SplitText → ui.js → motion.js

DOMContentLoaded
  ├─ ui.js (IIFE): nav, мобильное меню, lightbox, форма, scroll-lock,
  │                 объявляет window.Shtolli.{lockScroll, unlockScroll, closeMobileMenu}
  └─ motion.js (IIFE):
        reduce-motion / нет GSAP / нет ScrollTrigger?
          ├─ ДА  → html.motion-off (если либы нет), счётчики в финал, прелоадер снять, выход
          └─ НЕТ → motion path:
                   register plugins → Lenis(autoRaf:false) → ticker wiring →
                   boot() [anchors, reveals, clip, parallax, marquee, counters,
                           magnetic, project-preview, ScrollTrigger.refresh hooks] →
                   start() [прелоадер «розлив бронзы» → снять → playHero()]
```

## Прогрессивное улучшение — три режима

| Режим | Класс на `<html>` | Поведение |
|---|---|---|
| Полный моушен | `js` (+`lenis`) | Lenis + все GSAP-анимации |
| Reduced motion | `js reduce-motion` | Анимации выключены, контент сразу виден, нативный скролл, счётчики в финале |
| JS/CDN недоступны | `no-js` или `js motion-off` | Контент виден, marquee — CSS-анимация (no-js), нативный скролл с `scroll-margin-top` |

CSS-правила, гарантирующие видимость контента (см. `base.css`):

```css
html.js [data-reveal]      { opacity:0; transform:translateY(26px); }   /* спрятать только при JS */
html.reduce-motion [data-reveal],
html.motion-off   [data-reveal] { opacity:1 !important; transform:none !important; }  /* вернуть */
```

## JS-модули

Скрипты — **классические** (не ES-модули), чтобы работать и по `file://`, и по
`http://` без бандлера. Общее состояние — через единый неймспейс `window.Shtolli`.

### `ui.js` (интеракции, без зависимостей)

- `Shtolli.lockScroll() / unlockScroll()` — блокировка скролла; делегирует
  `lenis.stop()/start()` если Lenis есть, иначе `body{overflow:hidden}`. Со счётчиком
  вложенности (меню + lightbox).
- `createFocusTrap(container, {triggerEl, onClose})` — Tab/Shift+Tab внутри контейнера,
  Escape → закрыть, возврат фокуса на триггер.
- **Nav**: `is-stuck` при `scrollY>50` (нативный passive-листенер — работает в любом
  режиме); активная ссылка через `IntersectionObserver`.
- **Мобильное меню**: focus-trap + `inert` на `<main>` + `aria-expanded`.
- **Lightbox**: список строится из статичного DOM галереи; prev/next/ESC/стрелки;
  `inert` на фон; focus-trap.
- **Форма**: валидация, состояние успеха, сборка `mailto:`, `aria-live` подсказка.

### `motion.js` (моушен, GSAP + Lenis)

Чистые init-функции, каждая идемпотентна и проверяет наличие целей:
`initAnchors, playHero, initReveals, initClipReveals, initParallax, initMarquee,
initCounters, initMagnetic, initProjectPreview`. Оркестратор — `boot()` и `start()`.
Подробности по каждой — [MOTION.md](MOTION.md).

## Данные

Контент — **в разметке** (галерея, услуги, проекты, контакты — статичный HTML). Это
проще для SEO, краулеров и режима без JS. Для серьёзного объёма контента можно вынести
в JSON + генерацию, но для одностраничника это переусложнение (YAGNI).

## CSS-архитектура

- `tokens.css` — единственный источник правды для значений (цвет, шкала типографики,
  отступы, радиусы, тени, easing/длительности, высота навбара).
- `base.css` — reset, типографические утилиты, лейаут-примитивы (`.container`,
  `.section`), reveal-состояния, прелоадер, reduced-motion.
- `components.css` — все компоненты (BEM-подобные имена) + адаптивные брейкпоинты.

Брейкпоинты: `900px` (десктоп-nav → бургер), `760px` (масонри 4→2 колонки), `480px`
(кнопки hero в столбец), плюс `hover:none` (отключение magnetic/preview на тач).
