# MySewa REST API Reference

Spring Boot API for the MySewa house rental platform. Runs on **port 8090** by default.

## Stack

| Component | Version / approach |
|-----------|-------------------|
| Spring Boot | 3.2.x (`spring-api/pom.xml`) |
| Java | 17 |
| Spring Security | 6.x (stateless JWT filter + CORS) |
| Database | MySQL — **`mysewa`** (`DB_NAME=mysewa`) |
| Auth | JWT (jjwt 0.11.x), **24-hour** token expiry, BCrypt passwords |
| Role checks | Controllers via `AuthService.me()` |
| CORS | Vite (`5173`), Docker web (`8888`) |

> The React app uses **`/api/v1/*`**. Legacy **`/api/*`** aliases remain on the same controllers.

## Roles

| Role | Access |
|------|--------|
| **Public** | Browse/search properties, property detail, universities |
| **Student** | Bookings, payments, reviews, saved properties, notifications |
| **Landlord** | CRUD own properties, manage booking requests |
| **Admin** | Users, verification, statistics, database explorer |

## Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register student/landlord |
| POST | `/api/v1/auth/login` | Login → JWT |
| POST | `/api/v1/auth/logout` | Logout (client drops token) |
| GET | `/api/v1/auth/me` | Current user |
| PUT | `/api/v1/auth/me` | Update own profile |
| POST | `/api/v1/auth/forgot-password` | Password reset email |
| POST | `/api/v1/auth/reset-password` | Set new password |
| GET | `/api/v1/auth/verify-email?token=` | Email verification |

**Header:** `Authorization: Bearer <token>`

## API domains

| Domain | Primary prefix | Notes |
|--------|----------------|-------|
| Users | `/api/v1/users` | Admin CRUD + self profile |
| Properties | `/api/v1/properties` | Search, CRUD, uploads |
| Bookings | `/api/v1/applications` | Aliases: `/api/v1/bookings` |
| Payments | `/api/v1/payments` | Ledger in `financial_transactions` |
| Reviews | `/api/v1/reviews` | Student reviews |
| Saved | `/api/v1/saved-properties` | Student wishlist |
| Notifications | `/api/v1/notifications` | DB-backed; created on booking events |
| Admin | `/api/v1/admin` | Stats, users, verify, logs, payments |
| Universities | `/api/v1/universities` | Public list + admin manage |

## Database

**Name:** `mysewa`

| Spec | Table |
|------|-------|
| users | `users` |
| properties | `properties` |
| bookings | `applications` |
| payments | `financial_transactions` |
| reviews | `property_reviews` |
| notifications | `notifications` |
| saved_properties | `saved_properties` |

Schema: `docs/mysewa-schema.sql`  
Migration: `docs/migrations/2026-06-21-saved-properties-notifications.sql`

## Run locally

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS mysewa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Start API (Java 17 required)
cd spring-api
set DB_NAME=mysewa
set DB_PORT=3307
mvn spring-boot:run
```

Or with Docker Compose from repo root: `docker compose up --build`
