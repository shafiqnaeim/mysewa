# New Database Setup (Spring API)

Use a separate MySQL schema for the new system while still reusing stable data design from the old project.

## 1) Create schema and tables (XAMPP/phpMyAdmin)

**XAMPP on port 3307** (avoids conflict with another MySQL on 3306):

1. Stop MySQL in XAMPP.
2. Edit `C:\xampp\mysql\bin\my.ini` — under `[mysqld]` set:
   ```ini
   port=3307
   ```
   Search the file for any other `port=3306` and change those to `3307` as well.
3. Edit `C:\xampp\phpMyAdmin\config.inc.php` — find `$cfg['Servers'][$i]['host']` and add:
   ```php
   $cfg['Servers'][$i]['port'] = '3307';
   ```
4. Start MySQL in XAMPP (should stay running on **3307**).

Spring API defaults to `localhost:3307` in `application.yml`.

Option A (recommended):
- Open phpMyAdmin from XAMPP (`http://localhost/phpmyadmin`)
- Go to **Import**
- Select `docs/mysewa-schema.sql`
- Click **Go**

Option B (manual SQL):
- Open SQL tab in phpMyAdmin and run:

```sql
CREATE DATABASE IF NOT EXISTS mysewa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 2) Point Spring Boot to the schema

In PowerShell before starting API:

```powershell
$env:DB_NAME="mysewa"
cd C:\mysewa\spring-api
mvn spring-boot:run
```

Optional if your DB server is not default:

```powershell
$env:DB_HOST="localhost"
$env:DB_PORT="3307"
$env:DB_USER="root"
$env:DB_PASSWORD=""
```

## 3) Verify in phpMyAdmin

- Expand database `mysewa`
- Confirm tables: `users`, `properties`, optional `applications` (reserved for a future rental-application feature)
- Check `users.email` has `UNIQUE` index

## 4) Quick app verification

- API up: `http://localhost:8090/api/v1/properties`
- Register/Login from React pages:
  - `http://localhost:5173/signup`
  - `http://localhost:5173/signin`

