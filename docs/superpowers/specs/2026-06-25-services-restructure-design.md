# Services restructure — design spec

**Date:** 2026-06-25
**Status:** Approved by owner (taxonomy + URL strategy confirmed)
**Scope:** Reformat the 3 service pages into 3 clear, non-overlapping blocks so a visitor instantly knows which service fits. Frontend/content only — no backend. (The admin/CRM is a separate project.)

## Taxonomy (3 blocks, no meaning overlap)

| Block | Page (URL kept) | Theme | Contains | Excludes |
|---|---|---|---|---|
| 1. Изготовление скульптур | `services/sculpture.html` | Объём / фигуры | Статуи и композиции, фигуры в полный рост, садово-парковая, анималистическая, монументальная/декоративная, фигурная мемориальная (православные фигуры, распятия) | Бюсты, барельефы, таблички (→ блок 2) |
| 2. Бюсты, барельефы и памятные таблички | `services/lityo.html` (re-themed) | Портрет / память | Портретные бюсты (по фото/с натуры), портретные барельефы, памятные и мемориальные таблички, мемориальные доски, фамильные гербы, медали и наградные знаки | Крупные объёмные фигуры (→ блок 1) |
| 3. Услуги скульптора | `services/uslugi.html` | Ремесло / процесс | Ручная лепка мастер-моделей, 3D-моделирование под литьё/печать, авторские копии и реплики, реставрация, работа по фото/эскизу/чертежу, доводка | Готовые продукты блоков 1–2 (не дублировать) |

**Разграничение смыслов:** Блок 1 = объём · Блок 2 = портрет/память · Блок 3 = ремесло/процесс.
- «Художественное литьё» = техника, упоминается в 1 и 2 как способ изготовления; не отдельный блок (бывший «Художественное литьё» влит в блок 1 как полный цикл).
- «3D-моделирование» = краткий шаг цикла в блоках 1/2 vs самостоятельная услуга (подробно) в блоке 3.

**URL strategy:** keep the 3 existing URLs (`sculpture.html`, `lityo.html`, `uslugi.html`) — preserves SEO equity + internal links; only content/titles change. (Rename rejected: risk to the SEO just built for `lityo.html`.)

## Per-page content

### sculpture.html — «Изготовление скульптур»
- title: `Изготовление скульптур на заказ — литьё из бронзы и латуни · ШТОЛЛИ, Сочи`
- H1: `Изготовление объёмных скульптур из бронзы и латуни`
- description: объёмные скульптуры: статуи, фигуры, садово-парковая, анималистическая, монументальная, мемориальная; полный цикл литья из бронзы в Сочи.
- capabilities: статуи и композиции · фигуры в полный рост · садово-парковая · анималистическая · монументальная/декоративная · фигурная мемориальная (православные фигуры, распятия).
- process line: эскиз → 3D → форма → литьё бронзы/латуни → чеканка → патина → монтаж.
- Service schema offers aligned; FAQ about figure sculpture (materials, size, memorial figures, term).
- cross-ref: bust/relief/plaque → block 2; custom modeling/restoration → block 3.

### lityo.html — «Бюсты, барельефы и памятные таблички»
- title: `Бюсты, барельефы и памятные таблички на заказ — бронза · ШТОЛЛИ Сочи`
- H1: `Бюсты, барельефы и памятные таблички из бронзы`
- description: портретные бюсты по фото, барельефы, мемориальные доски и памятные таблички, фамильные гербы, медали; литьё бронзы/латуни, Сочи.
- capabilities: портретные бюсты (по фото/с натуры) · портретные барельефы · памятные/мемориальные таблички · мемориальные доски · фамильные гербы и геральдика · медали, наградные знаки, призы.
- keep phrase «художественное литьё из бронзы» in body (preserve the high-value keyword as technique).
- Service schema offers aligned; FAQ about bust-by-photo, relief, memorial plaque, medals.
- cross-ref: full figure → block 1; modeling/3D/restoration → block 3.

### uslugi.html — «Услуги скульптора»
- title: `Услуги скульптора в Сочи: ручная лепка, 3D-моделирование, реплики — ШТОЛЛИ`
- H1: `Услуги скульптора: ручная лепка и 3D-моделирование`
- description: ручная лепка мастер-моделей, 3D-моделирование под литьё, авторские копии и реплики, реставрация, работа по фото/эскизу.
- capabilities: ручная лепка мастер-моделей · 3D-моделирование под литьё/печать · авторские копии и реплики · реставрация и доработка · работа по фото/эскизу/чертежу · чеканка/доводка.
- positioning: «лепим руками; 3D — там, где нужна точность».
- Service schema offers aligned; FAQ about modeling, 3D, replicas, restoration.
- cross-ref: ready figure → block 1; bust/relief/plaque → block 2.

## Site-wide propagation
- **index.html `#services`** section: 3 teaser cards updated to the new block names + 1-line each, linking to the 3 pages.
- **«Другие услуги»** cross-link cards on each service page: new names.
- **Breadcrumbs** (visible + BreadcrumbList JSON-LD): block-2 crumb → «Бюсты, барельефы и таблички».
- **FAQ + FAQPage schema** on each page: re-themed per block (text must keep matching schema).
- **Blog→service body links** re-map to new taxonomy: lityo-bronzy→sculpture; patinirovanie→sculpture; 3d-modelirovanie→uslugi; portretnyy-barelyef→lityo (block 2)+uslugi; bronzovaya→sculpture.
- Keep telephone/NAP, layout, nav, footer, scripts, Metrika unchanged.

## Verification
- JSON-LD validates (0 bad); FAQ visible text == FAQPage schema text.
- No semantic duplication across the 3 pages (each capability appears in exactly one block).
- Deploy to shtolli.ru; spot-check live titles/H1/links.

## Out of scope
- Admin/CRM + gallery CMS (separate spec/project, needs PHP+MySQL backend).
