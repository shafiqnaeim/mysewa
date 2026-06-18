# MySewa — Docker

Run the full stack (MySQL + Spring API + React UI) with Docker Compose.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows)
- Copy environment file:

```powershell
cd c:\mysewa
copy .env.example .env
```

Edit `.env` — at minimum set `DB_PASSWORD` to a strong local password.

## Start

```powershell
cd c:\mysewa
docker compose up --build
```

First build can take several minutes (Maven + npm).

- **App:** http://localhost:8888 (or whatever `WEB_PORT` is in `.env`)  
- **API** (internal): `http://api:8090` — browser uses nginx proxy at `/api`  
- **MySQL on host** (optional): `localhost:3307` (see `MYSQL_PUBLISH_PORT` in `.env`)

Default admin (from `.env`): `APP_ADMIN_EMAIL` / `APP_ADMIN_PASSWORD` (see `docs/ADMIN-LOGIN.md` — local defaults use `admin@localhost` / `Admin123`, and you can sign in with username `admin`.)

## Stop

```powershell
docker compose down
```

Data is kept in Docker volumes (`mysql_data`, `uploads_data`). To wipe everything:

```powershell
docker compose down -v
```

## Architecture

| Service | Container | Role |
|---------|-----------|------|
| `web` | nginx | React static files; proxies `/api` and `/uploads` |
| `api` | Spring Boot | REST API on port 8090 |
| `mysql` | MySQL 8 | Database `mysewa` |

Uploaded images are stored in the `uploads_data` volume at `/app/uploads/properties/` inside `api`.

## Development without Docker

You can still run locally as before:

- `spring-api`: `mvn spring-boot:run` (port 8090)
- `react-web`: `npm run dev` (port 5173, Vite proxy)

Docker is for a **single-command demo** and FYP deployment documentation.

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| `npm ci` / `ECONNRESET` during **web** build | Retry `docker compose build web` (Dockerfile retries 5×). Or use **prebuilt** flow below. |
| `api` exits on startup | `docker compose logs api` — often MySQL not ready; run `docker compose up` again |
| Photos missing after recreate | Use named volume `uploads_data`; avoid `docker compose down -v` unless intentional |
| Port in use (`bind: Only one usage of each socket`) | Edit `.env`: `WEB_PORT=8888` and `APP_BASE_URL=http://localhost:8888`, then `docker compose up` |
| Email not sending | Set `MAIL_*` in `.env`; SMTP must be reachable from the container |

### Web build failed: `npm ci` network error

Your **api** image may already be built; only **web** failed. Option A — retry:

```powershell
cd c:\mysewa
docker compose build web
docker compose up
```

Option B — build React on your PC, then use a smaller nginx-only image:

```powershell
cd c:\mysewa\react-web
npm ci
npm run build
cd c:\mysewa
```

Add to `.env`:

```env
WEB_DOCKERFILE=Dockerfile.prebuilt
```

Then:

```powershell
docker compose up --build
```
