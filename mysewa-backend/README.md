# MySewa Backend

Spring Boot 3.2 REST API for the MySewa house rental platform.

## Stack

- Java 17, Spring Boot 3.2.x, Spring Security 6, JWT (jjwt 0.11), JPA, MySQL, Lombok

## Database

Uses MySQL database **`mysewa`** (already created).

```properties
spring.datasource.url=jdbc:mysql://localhost:3307/mysewa
```

Override via environment: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.

## Run

```powershell
cd mysewa-backend
mvn spring-boot:run
```

API: http://localhost:8090

Default admin (created on startup): `admin@localhost` / `Admin123` (override with `APP_ADMIN_EMAIL`, `APP_ADMIN_PASSWORD`).

## API base path

All endpoints under `/api/*` — see user spec for auth, properties, bookings, payments, reviews, saved properties, notifications, admin.

## Profiles

```powershell
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

Enables SQL logging via `application-dev.properties`.
