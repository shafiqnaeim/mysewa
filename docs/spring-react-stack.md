# Spring Boot + React (pilot stack)

This folder **`C:\mysewa`** holds the **new** stack (Spring Boot + React). Your legacy servlet WAR stays in **`C:\mysewa-project`** on Tomcat (**8080**) until you retire it.

## What was added

| Piece | Path | Role |
|--------|------|------|
| Spring Boot API | `spring-api/` | REST + Spring Data JPA on **port 8090** |
| React (Vite) | `react-web/` | SPA; dev server proxies `/api` → Spring |

## Quick start (development)

Terminal 1 — API (needs MySQL like `db.properties`):

```powershell
cd C:\mysewa\spring-api
mvn spring-boot:run
```

Optional env vars match `application.yml`: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.
For real email delivery (verification/reset): `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`, `APP_BASE_URL`.
If SMTP is not configured, the app prints links in backend console as `MAIL_DEBUG ...`.

For a separate schema (recommended while migrating), see `docs/new-database-setup.md`.

Terminal 2 — React:

```powershell
cd C:\mysewa\react-web
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). The listings page calls `GET /api/v1/properties`.

## Sanity check URLs

- Spring Boot: `http://localhost:8090/api/v1/properties`
- Optional filter: `http://localhost:8090/api/v1/properties?status=active`

## FYP‑safe migration plan (weeks timeline)

Do **vertical slices**, not big-bang rewrite.

1. **Read-only parity** — Property search/list/detail from Spring JPA while login stays on servlet.
2. **Auth** — JWT filter or Spring Security resource server issuing/validating tokens compatible with legacy (or OIDC-lite with session migration).
3. **Writes** — Create/update listing, applications, uploads; move servlets endpoint-by-endpoint.
4. **Front-end parity** — Rebuild dashboards in React router pages; reuse design tokens/CSS when useful.
5. **Cutover** — Package React build as static assets (served by Spring Boot or CDN) **or** run two deployments until demo day.

Legacy image URLs (`thumbnailPath`) may still hit Tomcat servlets until you port `Image*` endpoints into Spring — the React starter shows raw paths as a reminder.
