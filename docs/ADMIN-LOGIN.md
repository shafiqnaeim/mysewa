# Admin login (MySewa)



The Spring API **creates or updates** one administrator on every startup from `app.admin.email` and `app.admin.password` (see `spring-api/src/main/resources/application.yml`, or override with environment variables).



## Default credentials (local development)



| Field | Value |

|--------|--------|

| **Sign-in** | `admin` **or** the configured email (default `admin@localhost`) |

| **Password** | `Admin123` |



The login API still sends an `email` field from the sign-in form. You may type **`admin`** as that value; the API resolves it to `app.admin.email` when it matches (case-insensitive).



1. Start the **Spring API** (so bootstrap runs).

2. Open the app and go to **Sign in**.

3. Sign in with **`admin`** / **`Admin123`** (or `admin@localhost` / **`Admin123`**).

4. Open **`/admin`** (myDashboard for administrator).



The account is **email-verified** and **active** by bootstrap; role is **`admin`**.



If you previously used **`admin@mysewa.local`**, the first startup after this change will **migrate** that row to the new default email (when the configured mailbox did not exist yet and the legacy user is already an admin).



## If you use a `.env` file



Docker Compose and some setups load **`APP_ADMIN_EMAIL`** and **`APP_ADMIN_PASSWORD`** from `.env`. Those values **override** the defaults in `application.yml`.



- Copy from **`.env.example`** after pulling latest, **or** set:



```env

APP_ADMIN_EMAIL=admin@localhost

APP_ADMIN_PASSWORD=Admin123

```



Then **restart the API** so the bootstrap reconciles the user (password and role are synced on each start for that email).



## Changing password later



Update `APP_ADMIN_PASSWORD` (and optionally `APP_ADMIN_EMAIL`) in `.env` or `application.yml`, restart the API — bootstrap will **hash and apply** the new password to that email.



## Security



Do **not** use these defaults on a public server. Use long random passwords and keep them only in environment variables or a secrets manager.

