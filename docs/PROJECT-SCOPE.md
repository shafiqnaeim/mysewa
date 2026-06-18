# MySewa — project scope (FYP)

This document records the **current** agreed scope for MySewa. It supersedes older reference material where those lists differ.

## In scope

- User Authentication  
- Profile Management  
- Property Listing Management  
- Search and Filtering  
- Database Architecture  
- Responsive Web Interface Design  
- Payment Gateway  
- Legal Contract Generation  
- Financial Transaction Processing  

## Out of scope

- Integrated Messaging  
- Native Mobile Application  
- Legal Advisory Services  

## Use cases — official diagram (MySewa Reference)

These are the **seven use cases** inside the **MySewa** system boundary and the **three actors** exactly as in your reference **UML use case diagram** (Visual Paradigm). The PDF stores this page as a **raster image**, so it does not appear as extractable text in the PDF.

**Actors (outside the system boundary)**

| Actor | Role in the diagram |
|-------|----------------------|
| **Student** | Uses shared tenancy workflows with the landlord on four use cases |
| **Landlord** | Same four use cases as the student (different concrete actions inside each) |
| **System Administrator** | Three administration use cases |

**Use cases (inside the MySewa boundary)**

| # | Use case (as on diagram) | Associated actor(s) |
|---|---------------------------|------------------------|
| 1 | **Manage Account** | System Administrator |
| 2 | **Manage System Settings** | System Administrator |
| 3 | **Manage System Statistics** | System Administrator |
| 4 | **Manage Property** | Student, Landlord |
| 5 | **Manage Rental Application** | Student, Landlord |
| 6 | **Manage Reviews and Ratings** | Student, Landlord |
| 7 | **Manage Profile** | Student, Landlord |

### Supervisor progress checklist

Track implementation and thesis progress against the **diagram use case names** (not synthetic IDs). Add **Status** and **Evidence** when you meet with your supervisor.

| Use case (diagram) | Status | Evidence / notes |
|--------------------|--------|-------------------|
| Manage Account | **Done (prototype)** | Admin UI [`/admin`](react-web/src/pages/AdminDashboardPage.jsx): `GET /api/v1/admin/users`, `PUT /api/v1/admin/users/{id}/account-status` (active / suspended). |
| Manage System Settings | **Done (prototype)** | [`/admin/settings`](react-web/src/pages/AdminMySettingsPage.jsx) + `UniversityCampusCrudSection` → `UniversityController` (`/api/v1/universities/...`). |
| Manage System Statistics | **Done (prototype)** | Admin dashboard loads `GET /api/v1/admin/stats` (counts). Same page as user list. |
| Manage Property | **Done (prototype)** | Landlord: [`/my-properties`](react-web/src/pages/MyPropertiesPage.jsx) + property APIs. Student: Home [`/`](react-web/src/pages/LandingPage.jsx) search + filters + open listing. |
| Manage Rental Application | **Done (prototype)** | Apply from property modal; landlord applications on My properties; student dashboard + status; **Pay deposit** — manual (bank / QR / cash), **ToyyibPay** sandbox, mock pay; `financial_transactions`; optional **dev deposit reset** (`MYSEWA_DEV_RESET_DEPOSIT` — see `docs/PAYMENTS.md`); rental **agreement HTML** download. `ApplicationController` + `PaymentController`. |
| Manage Reviews and Ratings | **Done (prototype)** | `ReviewController` `/api/v1/reviews/...`; student **myProperty** hub [`/dashboard/student/property`](react-web/src/pages/StudentMyPropertyPage.jsx) + `PropertyReviewsSection`; listings show aggregate stats from API. |
| Manage Profile | **Done (prototype)** | **`GET/PUT /api/v1/auth/me`** — `AuthController` / `AuthService.updateProfile`. Persisted on `users`: `full_name`, `country`, `program_study`, `academic_year` (student), optional `phone_number`. UI: [`StudentMyAccountPage`](react-web/src/pages/StudentMyAccountPage.jsx), [`LandlordMyAccountPage`](react-web/src/pages/LandlordMyAccountPage.jsx). **Avatar + verification previews** remain `localStorage` (data URLs). |

### Re-audit snapshot *(vs earlier “localStorage profile” note)*

| What we verified again | Change / note |
|------------------------|----------------|
| **Manage Profile** | **Changed:** editable profile fields now **MySQL-backed** via **`PUT /api/v1/auth/me`** (not only `localStorage`). Schema: `country`, `program_study`, `academic_year` on `users` — see [`docs/mysewa-schema.sql`](mysewa-schema.sql). |
| **Manage Rental Application** | **Clarified:** payment story includes **ToyyibPay**, manual channels, ledger rows, and optional **clear deposit for local re-test**. |
| All other diagram use cases | **Unchanged:** still demonstrable as before (admin, settings, stats, property, reviews). |

### Manage Profile — what is in MySQL vs the browser

| Stored in **MySQL** (`users`) | Still **browser-only** (localStorage) |
|-------------------------------|----------------------------------------|
| `full_name`, `phone_number` (if included in save body), `country`, `program_study`, `academic_year` (student) | Profile **photo** (data URL), **verification** upload previews (IC / matric / selfie) |

Use **`PUT /api/v1/auth/me`** with JSON body `{ "fullName", "phoneNumber"?, "country"?, "programStudy"?, "academicYear"? }`. Email, password, role, and IC are **not** changed by this endpoint.

### Prototype “finished” (supervisor check-in)

If the supervisor only cares that the **prototype system is finished**, use this as **Definition of Done**: each **diagram use case** is **demonstrable in one sitting** (quality can be prototype-level; no need for production payment or legal advice).

**Checklist — all ticked = you can report “prototype complete”**  
*(Below reflects a codebase walk-through; adjust if your deploy differs.)*

- [x] **Manage Profile** — Student and landlord can sign in and update their profile (verification optional to show). *Name / country / programme / year persist via **`PUT /api/v1/auth/me`**; avatar + verification images remain local previews unless you add file upload to the server later.*
- [x] **Manage Property** — Landlord can create/edit listings; student can search/filter and open a property (view/details).
- [x] **Manage Rental Application** — Student can apply; landlord can see applications; **student can see own applications**; landlord can **update application status** (e.g. pending/accepted/rejected). *Optional but recommended for a clear “finish” story.*
- [x] **Manage Reviews and Ratings** — At least one **persisted** path (submit + display) **or** a clearly bounded prototype (e.g. ratings from API + note in demo script) — confirm wording with supervisor if time is tight.
- [x] **Manage Account** — Admin-only flow: e.g. **list users** and **one** account action (activate/suspend or view detail).
- [x] **Manage System Settings** — At least one **admin-managed configuration** you can show (e.g. universities/campuses or platform settings page).
- [x] **Manage System Statistics** — One **admin dashboard** view with **simple counts** (users, properties, applications) — enough to satisfy “statistics” as prototype.

**Written in-scope extras** (payment, legal contract, financial processing): the prototype goes **beyond** a single mock-only path: **ToyyibPay sandbox** bills + callback, **manual** deposit confirmation, rows in **`financial_transactions`**, optional **dev deposit reset** for re-testing (`docs/PAYMENTS.md`), and a **downloadable rental agreement (HTML)** from an accepted application. A formal **PDF** pipeline is still optional polish, not required for the diagram use cases.

### How your **expanded in-scope** items attach to this diagram

Your written scope also includes **Payment Gateway**, **Legal Contract Generation**, and **Financial Transaction Processing**. The reference diagram does **not** show separate ovals for those. For the FYP and supervisor meetings, treat them as **elaborations / sub-processes** mainly under **Manage Rental Application** (and persisted via **Database Architecture**) — e.g. **ToyyibPay / manual deposits** + **`financial_transactions`**, **agreement HTML** export — unless you **redraw** the diagram to add new ovals later.

- **Search and Filtering** → part of **Manage Property** from the student side (browse/filter catalogue); landlord side = listing CRUD and status inside the same use case.  
- **User Authentication** → supports all use cases; admin-side account control aligns with **Manage Account**.  
- **Responsive Web Interface Design** → quality attribute across all seven use cases.

### Cross-cutting

- **Database Architecture** supports persistence for **Manage Property**, **Manage Rental Application**, **Manage Reviews and Ratings**, **Manage Profile**, and admin data for the three admin use cases.  
- **Integrated Messaging, native Mobile App, Legal Advisory** remain **out of scope** (no ovals on the diagram for these).

### Diagram asset

The diagram image is copied into the repo as **`docs/mysewa-use-case-diagram.png`** for your thesis and supervisor pack.

---

*Last updated: checklist re-audit — profile `PUT /api/v1/auth/me`, rental/payment evidence expanded, extras paragraph aligned with current build.*
