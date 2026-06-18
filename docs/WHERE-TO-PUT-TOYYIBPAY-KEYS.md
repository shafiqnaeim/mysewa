# Where to paste ToyyibPay keys (click these files)

Use the **same variable names** ToyyibPay gives you; only the **file** changes depending on how you run the API.

## 1) Docker Compose (most common for this repo)

1. Open **`c:\mysewa\.env`** (create it by copying **`.env.example`** if you do not have `.env` yet).
2. Fill in these lines (no quotes needed for simple values):

   ```env
   TOYYIBPAY_ENABLED=true
   TOYYIBPAY_SANDBOX=true
   TOYYIBPAY_USER_SECRET_KEY=paste_your_secret_key_here
   TOYYIBPAY_CATEGORY_CODE=paste_your_category_code_here
   ```

3. You do **not** need to edit **`c:\mysewa\docker-compose.yml`** for normal use — it already reads `${TOYYIBPAY_...}` from `.env`. Open it only if you want to see how variables are passed into the `api` service (`services.api.environment`).

4. Restart containers after saving `.env` so the API picks up new values.

## 2) Running Spring from the IDE (`mvn spring-boot:run`)

Spring does **not** automatically load the repo root **`.env`**.

- Put the same **`TOYYIBPAY_*`** names in your **Run configuration → Environment variables**, **or**
- Export them in the terminal before starting the API.

Also set (same run config or shell):

- **`APP_BASE_URL`** — the React dev URL you use in the browser, usually **`http://localhost:5173`** (Vite).
- **`APP_PUBLIC_API_URL`** — public **HTTPS** URL pointing at **Spring’s port** (default **8090**). For local testing, run **`ngrok http 8090`** and paste the `https://…` origin here (no path). ToyyibPay will call `{APP_PUBLIC_API_URL}/api/v1/payments/toyyibpay/callback`.
- **`MYSEWA_DEV_RESET_DEPOSIT=true`** — optional; enables **Clear deposit (test)** on the student dashboard so you can undo a mock/manual deposit and open **Pay deposit** again. **Never** on production.

Your Vite app proxies **`/api`** to `127.0.0.1:8090` (`react-web/vite.config.js`); ngrok on **8090** hits the same API for callbacks.

Reference for property names (optional read): **`c:\mysewa\spring-api\src\main\resources\application.yml`** → `app.payment.toyyibpay` (values still come from env vars like `TOYYIBPAY_USER_SECRET_KEY`).

## 3) Public callback URL

ToyyibPay must reach your API over the internet. Set **`APP_PUBLIC_API_URL`** (see **`docs/PAYMENTS.md`**) — e.g. ngrok URL — not `localhost` alone.
