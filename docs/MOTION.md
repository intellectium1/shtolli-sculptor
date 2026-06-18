# Спецификация моушена

Весь моушен живёт в [`assets/js/motion.js`](../assets/js/motion.js) и работает на
**GSAP 3.15** (core + ScrollTrigger + SplitText) поверх плавного скролла **Lenis 1.3.23**.
Принцип: анимируем только compositor-friendly свойства (`transform`, `opacity`,
`clip-path`), `will-change` ставим точечно и снимаем после.

## Интеграция Lenis ↔ GSAP

Канонический паттерн синхронизации (иначе scroll-driven анимации «плавают»):

```js
const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });   // autoRaf по умолчанию НЕ используем
lenis.on('scroll', ScrollTrigger.update);                     // Lenis -> ScrollTrigger
gsap.ticker.add((t) => lenis.raf(t * 1000));                  // один rAF-цикл (сек -> мс)
gsap.ticker.lagSmoothing(0);                                  // без скачков после долгих кадров
```

- `ScrollTrigger.refresh()` вызывается после `document.fonts.ready` и `window load` —
  шрифты и поздно загруженные картинки меняют размеры → позиции триггеров.
- Якорные ссылки идут через `lenis.scrollTo(target, { offset: -navH })` — учитываем
  фикс-навбар. В reduced-motion/без Lenis работает нативный скролл + `scroll-margin-top`.

## Гарантия доступности

Первая же строка motion path:

```js
if (reduce || !hasGSAP || !hasST) { setCountersFinal(); dismissPreloader(); return; }
```

`reduce` определяется по классу `html.reduce-motion`, который ставится **до отрисовки**
inline-скриптом в `<head>`. То есть при `prefers-reduced-motion` ни Lenis, ни GSAP не
стартуют; контент виден через CSS-сброс reveal-состояний.

---

## Инвентарь анимаций

### 1. Прелоадер «розлив бронзы»
- Оверлей цвета чугуна; слово ШТОЛЛИ заливается бронзой снизу вверх через
  `clip-path: inset(100% 0 0 0) → inset(0% 0 0 0)` + прогресс-бар.
- GSAP-таймлайн (~0.95s) → `dismissPreloader(playHero)` → fade-out оверлея (0.76s).
- Не вредит LCP: hero-картинка `preload`-ится и грузится за оверлеем; reduced-motion —
  мгновенное снятие. Гейтит только JS-пользователей (`html.js .preloader{display:flex}`).

### 2. Кинематографичный hero (`playHero`)
Запускается, когда прелоадер открывает страницу. Таймлайн:
1. `clip-path` reveal главного фото (`inset(0 0 100% 0)→0`, `expo.out`, 1.3s) + `scale 1.14→1`.
2. Заголовок: `SplitText.create(h1, {type:'lines', mask:'lines'})`, строки
   `yPercent 116→0` со стаггером 0.11s (после анимации — `split.revert()` для чистого DOM).
   *Фолбэк без SplitText:* простой fade-up заголовка.
3. Eyebrow → lead → кнопки: `y/​autoAlpha` fade-up с перекрытием.
4. clip-path reveal второго (детального) фото.

### 3. Scroll-reveal секций (`initReveals`)
- Все `[data-reveal]` кроме hero собираются в `ScrollTrigger.batch`.
- `start: 'top 86%'`, `once: true`, стаггер 0.09s, `batchMax: 5` — элементы, входящие
  в кадр вместе, раскрываются волной. После завершения `clearProps:'willChange'`.

### 4. Clip-reveal изображений (`initClipReveals`)
- `[data-reveal-clip]` вне hero (фото в «О мастерской»): `clip-path` раскрытие + `scale`
  внутренней картинки, индивидуальный ScrollTrigger `once`.

### 5. Многослойный параллакс (`initParallax`)
- `[data-parallax="<n>"]`: `yPercent` от `n*55` до `-n*55`, `ease:'none'`, `scrub:1.2`,
  `invalidateOnRefresh`. Разные `n` (0.06…0.14) дают глубину. Триггер — секция элемента.

### 6. Бесшовная бегущая строка (`initMarquee`)
- Группа материалов клонируется один раз; трек `xPercent: 0 → -50`, `repeat:-1`,
  `ease:'none'` (~26s). Шов незаметен, т.к. вторая группа идентична первой.
- `ScrollTrigger` ставит на паузу, когда строка вне экрана.
- Фолбэк без JS: CSS `@keyframes marqueeSlide` под `html.no-js`.

### 7. Счётчики (`initCounters`)
- `[data-count]` (напр. `2.5`, `data-count-decimals="1"`): tween по proxy-объекту,
  `gsap.utils.snap`, формат `toLocaleString('ru-RU')`, ScrollTrigger `once` на `top 88%`.
- В reduced-motion `setCountersFinal()` сразу пишет финальные значения.

### 8. Magnetic-кнопки (`initMagnetic`)
- `[data-magnetic]`: `gsap.quickTo` по `x/y`, сила 0.3 от смещения курсора к центру,
  возврат `elastic.out(1,0.45)`. Только на устройствах с точным указателем
  (`navigator.maxTouchPoints===0 && hover:fine`).

### 9. Плавающее превью проектов (`initProjectPreview`)
- `.project-row[data-preview]`: единый `#project-preview` следует за курсором через
  `quickTo` (x/y), `autoAlpha` fade на enter/leave, подмена `src`. Отключено на тач
  (`hover:none` в CSS и JS).

### 10. Навигация
- `is-stuck` (матовый фон) при `scrollY>50` — нативный passive-листенер.
- Активная ссылка — `IntersectionObserver` по секциям (`rootMargin: -45% 0 -50%`),
  подчёркивание через `transform: scaleX`.

### 11. Lightbox / мобильное меню
- Открытие/закрытие — переходы `opacity/visibility/transform`; внутри — focus-trap,
  `inert` на фоне, блокировка скролла через Lenis.

---

## Бюджет и производительность моушена

- Только `transform` / `opacity` / `clip-path` — без layout-триггеров.
- `will-change` ставится перед анимацией и снимается в `onComplete/onLeave`.
- `ScrollTrigger.batch` + `once:true` — нет повторных колбэков на каждый скролл.
- Бесконечный rAF только один (через `gsap.ticker`, общий с Lenis).
- См. также [PERFORMANCE.md](PERFORMANCE.md).

## Как настроить

| Хочу | Где |
|---|---|
| Сделать скролл резче/мягче | `lenis` `lerp` в `motion.js` (↑ резче) |
| Изменить силу параллакса | значения `data-parallax` в `index.html` |
| Скорость бегущей строки | `duration` в `initMarquee` |
| Силу magnetic | множитель `0.3` в `initMagnetic` |
| Тайминги hero | таймлайн в `playHero` |
| Полностью отключить моушен | системная настройка «Reduce motion» — сайт уважает её автоматически |
