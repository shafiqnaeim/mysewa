# MySewa — payments (manual + ToyyibPay)

## “Mark as paid” vs real FPX every month — plain English

Think of **two different jobs**: (1) **money actually moving**, and (2) **your app remembering that rent was paid**.

| What you choose | What happens in real life | What the app does |
|-------------------|---------------------------|---------------------|
| **Mark as paid** (manual bank / QR / cash) | The student pays you **outside** the app — bank transfer, DuitNow QR at a shop, cash, etc. You already have the money. | The student (or you, in a demo) **ticks “I paid”** in the app. The API **saves a record** that the deposit is paid. **No** automatic charge from their bank each month. |
| **ToyyibPay / FPX** | Each time you want money, you send them to **ToyyibPay**; they pay **online** (e.g. FPX). Money flows through the gateway. | The app **creates a bill**, they pay on ToyyibPay’s site, then ToyyibPay **calls your server** so the app can mark the transaction. **More realistic**, but more setup (keys, public URL, testing). |

**“Every month”** usually means: *each month you would create a new bill* (or use another recurring product). This prototype mainly focuses on **deposit**; monthly rent the same idea but repeated.

**What is usually best for an FYP?**  
**Mark as paid + manual instructions** is the **simplest** story: “student pays landlord in the real world → app records it.”  
Add **ToyyibPay** if your supervisor wants to see a **real payment gateway** — you do not have to simulate FPX every month for the whole tenancy unless you choose that as a showcase.

**Where to paste ToyyibPay keys (exact files):** see **`docs/WHERE-TO-PUT-TOYYIBPAY-KEYS.md`**.

---

## `PAYMENT_MANUAL_QR_URL` and `TOYYIBPAY_CATEGORY_CODE` — do you need both?

**No.** They belong to **two different payment stories**; leave either one **blank** if you are not using that story.

| Setting | When you need it | If you leave it empty |
|--------|------------------|------------------------|
| **`PAYMENT_MANUAL_QR_URL`** | Only if you want the **“QR (DuitNow-style)”** tab to show a **picture** of a QR code for offline payment. | The QR tab still works: it shows a short message and the student can still tap **“I have paid via QR”** after paying in real life. **Bank transfer** and **cash** do not use this URL. |
| **`TOYYIBPAY_CATEGORY_CODE`** | Only if **`TOYYIBPAY_ENABLED=true`** and you want the **ToyyibPay** button to create real sandbox bills. | ToyyibPay stays **off** until you set **secret key + category code** (and `enabled=true`). The app treats ToyyibPay as “not configured” if those are missing. |

**“Implement both” in the codebase sense:** MySewa **already** supports manual paths **and** ToyyibPay. For your **demo config**, a common FYP setup is: **bank + holder + account** in `.env`, **QR URL empty**, ToyyibPay **either off** or **fully filled** when you demo the gateway.

### How to fill `PAYMENT_MANUAL_QR_URL` (optional)

It must be a **full HTTPS link** that returns an **image** (PNG or JPEG), and the student’s browser must be allowed to load it (public URL, not `file://`). Examples that work in student projects:

1. Upload your QR PNG to any **public static host** (object storage, `imgur.com`, a small file on **GitHub** in a public repo using **raw** URL, your own VPS static folder, etc.).  
2. Paste that URL into `.env`:  
   `PAYMENT_MANUAL_QR_URL=https://…/something.png`  
3. Restart the API. The Pay deposit → **QR** tab will show the image.

If you do not have a hosted image yet, **leave it blank** and use **Bank transfer** for the manual demo.

### How to fill `TOYYIBPAY_CATEGORY_CODE`

1. Log in to [ToyyibPay sandbox](https://dev.toyyibpay.com) (or production).  
2. Create a **Category** (merchant categories / bill categories — exact menu label can vary).  
3. Open the category details and copy the **Category Code** (alphanumeric id ToyyibPay shows for that category).  
4. Put it in `.env` as **`TOYYIBPAY_CATEGORY_CODE=...`** together with **`TOYYIBPAY_USER_SECRET_KEY`** and **`TOYYIBPAY_ENABLED=true`**. See **`docs/WHERE-TO-PUT-TOYYIBPAY-KEYS.md`**.

This code is **not** the same as a DuitNow QR string — it only tells ToyyibPay **what type of bill** you are creating.

---

## Manual (bank / QR / cash)

Configured in `spring-api/src/main/resources/application.yml` under `app.payment.manual`, or override with env:

| Env | Purpose |
|-----|---------|
| `PAYMENT_MANUAL_BANK_NAME` | Bank label shown to students |
| `PAYMENT_MANUAL_BANK_ACCOUNT` | Account number (copy button in UI) |
| `PAYMENT_MANUAL_BANK_HOLDER` | Account holder name |
| `PAYMENT_MANUAL_QR_URL` | Optional HTTPS URL to a QR image (PNG/JPEG) |

Students confirm in the app after paying offline; the API records a `financial_transactions` row (`deposit_bank`, `deposit_qr`, or `deposit_cash`).

## ToyyibPay (online)

1. Register at [ToyyibPay sandbox](https://dev.toyyibpay.com) (or production).
2. Create a **Category** and copy **Category Code** and **User Secret Key**.
3. **Where to put the keys** — step-by-step paths: **`docs/WHERE-TO-PUT-TOYYIBPAY-KEYS.md`**. Short version:

   - **Docker:** edit **`c:\mysewa\.env`** (copy from **`.env.example`**). Restart Docker after changes.
   - **IDE / `mvn spring-boot:run`:** set the same **`TOYYIBPAY_*`** names in the run configuration’s **environment variables** (Spring does not read the repo `.env` by itself).

   Variable names:


| Env | Purpose |
|-----|---------|
| `TOYYIBPAY_ENABLED` | `true` to show ToyyibPay in the student UI |
| `TOYYIBPAY_SANDBOX` | `true` for `dev.toyyibpay.com` |
| `TOYYIBPAY_USER_SECRET_KEY` | Secret key from dashboard |
| `TOYYIBPAY_CATEGORY_CODE` | Category code |

4. **`APP_PUBLIC_API_URL`** must be a **public** HTTPS URL pointing at this Spring API (e.g. ngrok), because ToyyibPay **POSTs** to `/api/v1/payments/toyyibpay/callback`. Localhost alone will not receive callbacks.

5. `APP_BASE_URL` is used for the payer **return** redirect to `/dashboard/student?deposit=return`.

Callback verifies `MD5(userSecretKey + status + order_id + refno + "ok")` per ToyyibPay docs.

### Quick sandbox test (ToyyibPay)

**Shared:** `TOYYIBPAY_ENABLED=true`, `TOYYIBPAY_SANDBOX=true`, `TOYYIBPAY_USER_SECRET_KEY`, `TOYYIBPAY_CATEGORY_CODE`. Restart the API after changing env.

#### Spring Boot in the IDE (no Docker)

Spring **does not** load the repo root **`.env`** by itself. Set variables in **Run → Edit Configurations → Environment variables** (IntelliJ / VS Code Java), or in the terminal before `mvn spring-boot:run`.

| Variable | Typical local value |
|----------|---------------------|
| **`APP_BASE_URL`** | Frontend URL in your browser, e.g. **`http://localhost:5173`** (Vite default). Used when ToyyibPay redirects the student back after payment. |
| **`APP_PUBLIC_API_URL`** | Public **HTTPS** base URL that reaches **this Spring API** on port **8090** (default `server.port`). Easiest: run **`ngrok http 8090`**, copy the `https://…` origin, set **`APP_PUBLIC_API_URL`** to that (no path, no trailing slash). ToyyibPay will POST to `{that}/api/v1/payments/toyyibpay/callback`. |

Your **`react-web`** dev server proxies **`/api`** to `http://127.0.0.1:8090` (see `vite.config.js`), so the browser and ToyyibPay both end up talking to the same Spring app — the browser via Vite, ToyyibPay via ngrok straight to 8090.

1. Start **Spring** (`8090`) and **Vite** (`npm run dev` in `react-web/`, usually `5173`).
2. Start **ngrok** toward **8090**, set **`APP_PUBLIC_API_URL`** to the ngrok HTTPS origin, restart Spring.
3. Flow: student applies → landlord accepts → **Pay deposit** → ToyyibPay sandbox → pay → return + callback.

#### Docker Compose

1. In **`.env`**: same ToyyibPay flags; **`APP_BASE_URL`** = URL you open (e.g. `http://localhost:8888` if that is `WEB_PORT`).
2. **Callbacks:** point ngrok at your **web** port (nginx proxies `/api/` to the API), **not** `8090` unless you published the API port. Set **`APP_PUBLIC_API_URL`** to that ngrok origin.
3. **`docker compose up`** after `.env` changes.

If the bill opens but the app never marks “paid”, check API logs for the callback and confirm ngrok URL + `APP_PUBLIC_API_URL` match.

### Where in the app to try ToyyibPay

1. Sign in as a **student**.  
2. Open **Dashboard** → **My rental applications** (`/dashboard/student`).  
3. You need at least one application with status **accepted** — otherwise **Pay deposit** does not appear. As **landlord**, go to **My properties** → **Rental applications** → **Accept** on that application, then switch back to the student account.  
4. On the accepted card, click **Pay deposit** → the modal shows **ToyyibPay** (active only when the API reports it is configured — see hint in the modal if greyed out).

### “Demo deposit paid” — try ToyyibPay again (local dev)

`depositPaid` is computed from rows in **`financial_transactions`**. After **mock pay**, **manual confirm**, or a **completed ToyyibPay** callback, the UI shows **Demo deposit paid** and hides **Pay deposit**.

**Option A — in-app (recommended for IDE / Docker):**

1. Set **`MYSEWA_DEV_RESET_DEPOSIT=true`** on the Spring API (IDE environment variables, or `.env` for Docker Compose — see `docker-compose.yml`). This maps to **`app.payment.dev-allow-deposit-reset`** in `spring-api/src/main/resources/application.yml`.
2. Restart the API. Open **student dashboard** → on an accepted application with deposit already paid, click **Clear deposit (test)**. **Pay deposit** returns so you can run ToyyibPay again.

**Option B — SQL (any environment):** delete deposit rows for your application id, e.g.  
`DELETE FROM financial_transactions WHERE application_id = ? AND type IN ('deposit_mock','deposit_bank','deposit_qr','deposit_cash','deposit_toyyibpay');`  
Then refresh the dashboard.

## API summary

- `GET /api/v1/payments/manual-instructions` — bank + optional QR URL (public).
- `GET /api/v1/payments/toyyibpay/options` — `{ enabled, sandbox, setupHint?, depositResetAllowed }` (public).
- `POST /api/v1/applications/{id}/deposit/manual` — body `{ "channel": "bank_transfer" | "duitnow_qr" | "cash" }` (student JWT).
- `POST /api/v1/applications/{id}/deposit/toyyibpay` — creates bill + pending row; returns `{ payUrl }` (student JWT).
- `POST /api/v1/payments/toyyibpay/callback` — ToyyibPay server callback (no JWT; hash check).
- `POST /api/v1/applications/{id}/deposit/reset-for-testing` — removes deposit rows for re-testing when **`MYSEWA_DEV_RESET_DEPOSIT=true`** (student JWT).

Legacy: `POST /api/v1/applications/{id}/mock-pay-deposit` still works (instant demo row).
