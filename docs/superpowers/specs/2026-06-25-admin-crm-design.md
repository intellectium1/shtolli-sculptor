# Admin / CRM + Gallery CMS — design spec

**Date:** 2026-06-25 · **Status:** Approved by owner
**Stack:** PHP 8.3 + PDO/MySQL (confirmed live: pdo_mysql, gd+webp, upload 256M). Lives on shtolli.ru (reg.ru) only; GitHub Pages = static mirror without dynamic features.
**Decisions:** data model = Clients + Projects; auth = single owner password; v1 includes photo attachments, deadlines/sums, Telegram lead alerts, CSV/JSON export.

## Goals
1. Centralised intake of site leads (quiz + contact) into one panel.
2. Client cards (contacts, history, notes) with multiple projects/orders each.
3. Project funnel (stages), deadlines, sums, photo attachments.
4. Gallery CMS: add/remove/edit images + descriptions; changes show on the public gallery immediately.
5. Export (CSV/JSON); Telegram alert on new lead.

## File layout
```
/admin.html                 public admin SPA (login-gated)
/assets/js/admin.js         admin app (vanilla, talks to API via JSON)
/assets/css/admin.css       admin styles (exists; extend)
/admin/api/                 PHP endpoints (JSON)
  _bootstrap.php            config load, PDO, session, CSRF, helpers, json_out()
  login.php  logout.php
  lead.php                  PUBLIC: create lead (forms post here)
  leads.php                 list / convert-to-client+project / mark spam
  clients.php  projects.php  notes.php  files.php  gallery.php  export.php
/db/schema.sql              DDL (one-time setup)
/admin/api/setup.php        one-time: run schema + seed gallery from current items (token-guarded, then disabled)
/assets/gallery.json        public gallery source of truth (written by gallery.php)
/assets/img/gallery/        uploaded gallery images (webp), + /assets/img/uploads/ project files
config (ABOVE webroot):     /var/www/u3552677/data/shtolli-config.php   (db creds, admin hash, telegram, app secret) — NOT in repo, NOT HTTP-reachable
```

## DB schema (utf8mb4, InnoDB)
- **clients**(id, name, phone, email, telegram, source, notes, archived, created_at, updated_at)
- **projects**(id, client_id FK, title, type, material, size, stage, deadline DATE, price DECIMAL, prepaid DECIMAL, status[active/done/archived], comment, created_at, updated_at)
- **leads**(id, source[quiz/contact], name, contact, type, material, size, timeline, comment, status[new/converted/spam], client_id NULL, ip, created_at)
- **project_notes**(id, project_id FK, text, created_at)
- **project_history**(id, project_id FK, stage, created_at)
- **project_files**(id, project_id FK, filename, original_name, mime, size, created_at)
- **gallery_items**(id, image, title, description, width, height, sort_order, visible, created_at, updated_at)
- **settings**(k PK, v)
- **lead_throttle**(ip PK, cnt, window_start)  — simple per-IP rate limit
Funnel stages (reuse current): new · consult · design · contract · production · finishing · done (+ archived). Mirror labels in admin.js.

## API contracts (all JSON; session-gated except lead.php)
- `POST lead.php` — public. body: {name, contact, type, material, size, timeline, comment, source, hp(honeypot)}. Validates, rate-limits per IP, inserts lead, optional Telegram notify. → {ok}.
- `POST login.php` {password} → sets session; `POST logout.php`.
- `GET leads.php` (filter status) · `POST leads.php?action=convert` {lead_id} → creates client+project, marks converted · `?action=spam`.
- `clients.php` GET list/one, POST create/update, archive.
- `projects.php` GET list (by stage/filters), POST create/update/move-stage/set deadline+price.
- `notes.php` POST add note (project).
- `files.php` POST upload (multipart) → validate mime (fileinfo) + re-encode to webp via GD (strips EXIF) + random name → assets/img/uploads/; DELETE remove.
- `gallery.php` GET items, POST create (upload image → webp → assets/img/gallery/), update (title/desc/visible), reorder, delete. On every change: rewrite assets/gallery.json (visible items, sorted).
- `export.php` GET ?what=clients|leads|projects&fmt=csv|json.

## Security checklist
- Config (secrets) above webroot; app reads via absolute path. Never in repo.
- Admin password: `password_hash` (bcrypt) in config; `password_verify` on login. Session cookie httponly+secure+SameSite=Strict. Login rate-limit.
- CSRF token (in session) required on all POST/state-changing API calls; admin.js sends it.
- All SQL via PDO prepared statements. No string-concat queries.
- Public lead.php: honeypot field + per-IP throttle (lead_throttle) + length/format validation + strip control chars.
- Uploads: whitelist image mimes via finfo; reject if GD can't decode; re-encode to webp (kills embedded payloads); random filenames; upload dirs have `php_flag engine off` / no-exec .htaccess; size cap.
- `.htaccess`: deny direct access to /db/, /admin/api/_bootstrap.php; uploads dir no script execution; HSTS already set.
- DB creds + admin hash generated locally, deployed once via SFTP to the above-webroot path; rotation note for the shared-hosting creds remains.

## Admin UI (admin.html + admin.js upgrade)
Login gate → top tabs:
- **Заявки** — inbox of leads; per lead: convert→client+project / mark spam.
- **Доска** — projects kanban by stage; cards show client, deadline, sum; drag/move stage; filters (stage, overdue, unpaid).
- **Клиенты** — list + search; client card: contacts, notes, history, list of their projects.
- **Галерея** — grid of gallery_items; upload, edit title/description, toggle visible, drag-reorder; "live on site" indicator.
- Project detail: notes, photo attachments (upload/preview/delete), deadline, price/prepaid/balance.
- Export button (CSV/JSON).

## Public integration
- `assets/js/config.js`: `window.SHTOLLI_LEAD_API = '/admin/api/lead.php'`. `ShtolliSend` posts there (keep mailto/Telegram graceful fallback if API down).
- quiz.js + ui.js contact form already call `ShtolliSend` → now hits lead.php. (leads-store.js localStorage stays as offline fallback only.)
- Gallery: convert the public `#gallery` (index.html) and gallery.html grids to render from `assets/gallery.json` via JS, preserving current masonry markup + lightbox (ui.js). Seed gallery.json from the existing hardcoded gallery items (migration in setup.php) so nothing is lost.

## Migration / setup
`setup.php?token=…` (token in config; run once, then set a done-flag): creates tables from schema.sql; seeds gallery_items from a provided JSON of current works (extracted from index.html) → writes gallery.json. After success, setup self-disables.

## Build phases
1. Config (above webroot) + schema.sql + setup.php → create tables, verify DB connectivity. **[testable milestone]**
2. Public lead intake: lead.php + wire forms (config.js/ui.js/quiz.js). Verify a real submit lands in DB.
3. Auth (login/logout, session, CSRF) + _bootstrap.
4. Admin API: leads/clients/projects/notes (+ history).
5. Admin UI: tabs, board, client card, lead inbox.
6. Gallery CMS: gallery.php + admin gallery tab + dynamic public gallery render + seed.
7. Extras: project files (upload→webp), deadlines/sums UI, Telegram notify, export.
8. Security review (workflow) + deploy + end-to-end test.

## Out of scope (v1)
Staff accounts/roles, online payments, email campaigns, funnel analytics dashboards.
