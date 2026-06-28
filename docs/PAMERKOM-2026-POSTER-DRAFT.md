# MySewa — PamerKom 2026 poster draft

Copy each section into `docs/PamerKom2026-PosterTemplate.pptx`. Replace bracketed placeholders with your real details.

**Template:** `docs/PamerKom2026-PosterTemplate.pptx`  
**Template preview:** see poster layout (ABSTRACT → DEMO QR CODE boxes)  
**Live demo:** http://68.183.235.74  
**Related:** `docs/PROJECT-SCOPE.md`, `docs/mysewa-use-case-diagram.png`, `DOCKER.md`

---

## POSTER PASTE-READY (box by box)

Use this section first. Text is shortened to fit the template boxes. Replace `[brackets]`.

### Top banner — PROJECT TITLE

```
MySewa: A Web-Based Student Rental Management System for University Communities
```

### Authors (under title)

**Author 1**  
`[Your full name]`  
Faculty of Computer Science and Mathematics (FSKM), Universiti Malaysia Terengganu (UMT)  
`[your.email@student.umt.edu.my]`

**Author 2 / 3** — delete rows if solo project.

---

### ABSTRACT (left column, first box)

```
MySewa is a responsive web platform for university area rentals near Universiti Malaysia Terengganu (UMT). It also covers Universiti Sultan Zainal Abidin (UniSZA). Students search and apply for rooms; landlords manage listings and applications; administrators oversee users, campus data, and statistics. The system uses role-based dashboards, REST APIs, MySQL, and deposit flows (manual transfer and ToyyibPay sandbox). A three-tier stack (React, Spring Boot, MySQL) is deployed live with Docker Compose on a DigitalOcean VPS (Singapore).
```

---

### INTRODUCTION

**Background**  
Students often find rentals through informal channels. Information is scattered and campus distance is unclear.

**Problem**  
No single system combines property search, applications, payments, reviews, and admin control for a university rental ecosystem.

**Target users**  
• Students — search, apply, pay deposit, manage tenancy  
• Landlords — list properties, handle applications, track rent  
• System administrator — users, campus pins, statistics  

---

### METHODOLOGY

**Approach:** Iterative prototype (vertical slices).

• Requirements — use-case diagram, scope, actor workflows  
• Design — ERD, REST API, responsive UI  
• Development — Spring Boot + React modules  
• Testing — manual functional tests per role  
• Deployment — Docker Compose on DigitalOcean VPS (live at http://68.183.235.74)

**Tools:** Visual Paradigm, Git, Maven, npm, MySQL, Docker, DigitalOcean

---

### TECHNOLOGY STACK (four lines + logos)

| Box label | Paste this |
|-----------|------------|
| **Frontend** | React (Vite), React Router, responsive CSS |
| **Backend** | Java Spring Boot, REST API (`/api/v1/...`), JWT |
| **Database** | MySQL 8 (JPA/Hibernate) |
| **Deployment** | Docker Compose on DigitalOcean VPS (Nginx + Spring Boot + MySQL) |

**TOOLS / FRAMEWORK LOGOS** — drop in icons for: React, Spring Boot, MySQL, Docker, Nginx, DigitalOcean.

---

### SYSTEM ARCHITECTURE / FLOW (large right box)

**Use the new architecture diagram** (same style as your older servlet diagram):

**File:** `docs/mysewa-architecture-diagram.svg`  
Insert into PowerPoint: *Insert → Pictures →* select the SVG (or export PNG from browser if PowerPoint needs it).

#### Title on poster
`Software Architecture (High Level) — MySewa`

#### What changed vs your old diagram

| Old (servlet) | New (current stack) |
|---------------|---------------------|
| HTML pages (`myproperty.html`) | **React SPA** (Vite), React Router |
| Tomcat + Servlets | **Spring Boot REST** controllers (`/api/v1/...`) |
| Model classes + JDBC | **Services + JPA Repositories** (Hibernate) |
| MySQL tables (same idea) | **MySQL 8** — users, properties, applications, reviews, payments, etc. |

#### Caption (optional, under diagram)
*Three-tier architecture: Presentation (React) → Application (Spring Boot REST API) → Data (MySQL). JSON over HTTP; no direct database access from the browser.*

---

### RESULTS / DEMONSTRATION

**Short text above screenshots:**

```
Prototype covers all seven use cases: property search, rental applications, deposits (manual + ToyyibPay sandbox), reviews, profile, and admin (stats, settings, database explorer). Deployed and tested on a live DigitalOcean VPS with role-based access.
```

**SCREENSHOT 1** — Landing page / property search results  
**SCREENSHOT 2** — Admin dashboard with statistics charts *(or student apply + landlord applications)*

---

### CONCLUSION & FUTURE WORK

**Main achievement**  
Integrated rental management prototype with modern web stack (React, Spring Boot REST API, MySQL), **live-deployed** with Docker Compose on a DigitalOcean VPS.

**Limitation**  
Web application only (no native mobile app); some profile images remain browser-local; HTTPS and ToyyibPay live callbacks are future enhancements.

**Future work**  
HTTPS/domain; mobile application; integrated messaging; enhanced file storage; PDF contracts.

---

### DEMO QR CODE

**Caption:**  
`Scan for MySewa live prototype`

**URL (generate QR from this):**  
`http://68.183.235.74`

**Small text under QR (optional):**  
`Docker Compose · DigitalOcean VPS · Singapore`

---

### Panel answer (if asked about deployment)

> “MySewa is **live** at **http://68.183.235.74**, deployed with **Docker Compose** on a **DigitalOcean VPS** in Singapore — Nginx serves the React UI and proxies `/api` to Spring Boot, with MySQL in containers. I can also demo the same stack on my laptop with Docker if Wi‑Fi is limited at the booth.”

---

## Full draft (reference — longer versions)

| Field | Text |
|--------|------|
| **Project title** | **MySewa: A Web-Based Student Rental Management System for University Communities** |
| **Author 1** | [Your full name] |
| **Affiliation** | Faculty of Computer Science and Mathematics (FSKM), Universiti Malaysia Terengganu (UMT) |
| **Email** | [your.email@student.umt.edu.my] |
| **Supervisor** *(if shown on poster)* | [Dr./Prof. Name] |

---

## ABSTRACT

MySewa is a responsive web platform for university area rentals near **Universiti Malaysia Terengganu (UMT)**. It also covers **Universiti Sultan Zainal Abidin (UniSZA)**. Students search and apply for rooms; **landlords** manage listings and applications; and **administrators** oversee users, campus data, and statistics.

The system uses role-based dashboards, **REST APIs**, MySQL persistence, and integrated deposit flows (manual bank transfer and ToyyibPay sandbox).

The project uses a **three-tier architecture** (React frontend, Spring Boot API, MySQL database). **Production deployment** is **live** on a **DigitalOcean VPS** (Singapore) using **Docker Compose** (Nginx + API + MySQL) at **http://68.183.235.74**. The same stack runs locally via `docker compose up` for development.

This FYP delivers a working **prototype** deployed online with a public URL (not `localhost`).

---

## INTRODUCTION

### Background

Students near universities often rely on informal channels (social media, word of mouth) to find rooms. Information is inconsistent, distances to campus are unclear, and landlords lack a single place to manage listings and applications.

### Problem statement

There is no unified, role-aware system that combines property discovery, rental applications, payments/deposits, reviews, and administration for a university rental ecosystem.

### Target users / stakeholders

- **Students** — search listings, apply, pay deposit, manage tenancy-related tasks  
- **Landlords** — publish properties, review applications, track rent  
- **System administrator** — user oversight, campus coordinates, statistics, data management  

### Project goal

Design and implement a three-tier web application that supports the seven official MySewa use cases and can be **deployed online** when development is complete.

---

## METHODOLOGY

**Approach:** Iterative **prototype** development (vertical slices).

| Phase | Activities |
|--------|------------|
| Requirements | Use-case diagram, scope document, actor workflows |
| Design | ERD (`docs/mysewa-schema.sql`), REST API design, responsive UI |
| Development | Spring Boot + React: auth, properties, applications, payments, admin |
| Testing | Manual functional testing, role-based walkthroughs |
| Deployment | Docker Compose on DigitalOcean VPS — **live** at http://68.183.235.74 |

**Tools:** Visual Paradigm (UML), Git, Maven, npm, MySQL, Docker Desktop, phpMyAdmin (for SQL import on hosting).

---

## TECHNOLOGY STACK

| Layer | Technology |
|--------|------------|
| **Frontend** | React (Vite), React Router, responsive CSS |
| **Backend** | Java Spring Boot, REST APIs (`/api/v1/...`), JWT authentication |
| **Database** | MySQL 8 (JPA/Hibernate) |
| **Payments** | Manual transfer + ToyyibPay (sandbox); `financial_transactions` ledger |
| **Maps** | Leaflet + OpenStreetMap; admin campus pins |
| **Local development** | Vite `:5173` → proxy → Spring `:8090` → MySQL |
| **Packaged demo / deploy** | Docker Compose: Nginx + Spring API + MySQL (`docker compose up -d --build`) |
| **Hosting** | DigitalOcean Droplet (2 GB RAM, Singapore region) |

**Logos for poster:** React, Spring Boot, MySQL, Docker, Nginx, DigitalOcean.

---

## SYSTEM ARCHITECTURE / FLOW

### Three-tier + REST

```
[ Browser ]
     |
     v
[ Web server ]  ---- React static files; proxies /api and /uploads
     |
     v
[ Spring Boot API :8090 ]  ---- REST JSON + JWT + business logic
     |
     v
[ MySQL 8 ]  ---- users, properties, applications, payments, universities
```

- Browser talks to the server over **HTTP/HTTPS**; it does **not** connect to MySQL directly.  
- All business logic goes through **REST APIs**.

### Main user flows (for a small flowchart on the poster)

1. **Student:** search → view listing → apply → pay deposit  
2. **Landlord:** create listing → review applications → rent calendar  
3. **Admin:** dashboard statistics → university map/settings → user oversight  

### Diagram assets in this repo

- Use-case diagram: `docs/mysewa-use-case-diagram.png`  
- Database: `docs/mysewa-schema.sql` (export simplified ERD for poster if needed)

---

## DEPLOYMENT (important for FYP)

### Live deployment (completed)

**Production: Docker Compose on DigitalOcean VPS**

| Item | Detail |
|------|--------|
| **Public URL** | **http://68.183.235.74** |
| **Provider** | DigitalOcean Droplet (Basic, 2 GB RAM, 1 vCPU, Singapore) |
| **Stack** | Nginx (React) + Spring Boot JAR (API) + MySQL 8 |
| **Orchestration** | `docker compose up -d --build` |
| **Guide** | `DOCKER.md` at repo root |

**Architecture:** Browser → Nginx (`/api`, `/uploads` proxied) → Spring Boot → MySQL. Same `docker-compose.yml` runs locally and on the VPS (production `.env` on server).

### What “deploy” means

| Term | Meaning |
|------|---------|
| **Localhost** | Development / PamerKom backup demo |
| **GitHub** | Source code — not a running app |
| **http://68.183.235.74** | **Yes** — live public deployment |

### Rubric vs demo

| Situation | What to tell panel |
|-----------|-------------------|
| **Report / poster** | Live at **http://68.183.235.74** — Docker Compose on DigitalOcean VPS |
| **PamerKom booth** | QR scans to live URL; laptop Docker demo as backup |

### Deploy checklist (completed)

- [x] DigitalOcean Droplet created (Singapore, Ubuntu, 2 GB)  
- [x] Docker + Docker Compose installed  
- [x] MySewa cloned; production `.env` configured  
- [x] Firewall port 80 open  
- [x] `docker compose up -d --build`  
- [x] Public URL verified in browser  
- [ ] HTTPS / custom domain (future work)  
- [ ] ToyyibPay enabled on live server (future work)

See **`DOCKER.md`** for local commands and redeploy (`git pull` + `docker compose up -d --build`).

---

## RESULTS / DEMONSTRATION

### Implemented (prototype)

- Registration, email verification, JWT login (student / landlord / admin)  
- Property search, filters, landlord listing CRUD  
- Rental applications and status workflow  
- Deposit payment (manual + ToyyibPay sandbox) and transaction records  
- Reviews and ratings  
- Admin: dashboard charts, mySettings (university map), myDatabase explorer  
- REST API backend; responsive web UI  

### Screenshots to add (4–6)

1. Landing / search results  
2. Property detail + apply  
3. Student dashboard / myProperty  
4. Landlord My Properties  
5. Admin dashboard (charts)  
6. Browser showing **http://68.183.235.74** (live deploy) or `docker compose ps` on VPS  

### Testing

Core use cases demonstrable end-to-end on the **live VPS** and local Docker; role-based access enforced via API.

---

## DEMO QR CODE

**Primary (use on poster):**

| Option | URL | When to use |
|--------|-----|-------------|
| **Live MySewa** | **http://68.183.235.74** | **Primary** — scan for working prototype |
| GitHub repo | `https://github.com/[USER]/mysewa` | Source code only |
| Demo video | Google Drive / YouTube | Backup if site is down |

**Caption:** *Scan for MySewa live prototype.*

**QR content:** `http://68.183.235.74`

---

## CONCLUSION & FUTURE WORK

### Main achievement

MySewa delivers an integrated student rental management **prototype** with a modern stack (React + Spring REST + MySQL), **live-deployed** at **http://68.183.235.74** using Docker Compose on DigitalOcean.

### Limitations

- Web application only (no native mobile app)  
- HTTP only (HTTPS / custom domain not yet configured)  
- ToyyibPay sandbox not enabled on live server yet  
- Some profile images remain browser-local  

### Future work

- HTTPS and custom domain  
- Mobile application development  
- Integrated messaging system  
- PDF contracts; enhanced file storage on server  
- ToyyibPay integration on production URL  

---

## Footer (template default)

**FACULTY OF COMPUTER SCIENCE AND MATHEMATICS (FSKM) | UNIVERSITI MALAYSIA TERENGGANU (UMT)**

---

## Quick reference — deployment FAQ (for you, not necessarily on poster)

**Q: How is MySewa deployed?**  
**A:** **Docker Compose on a DigitalOcean VPS** (Singapore, 2 GB) — Nginx + Spring Boot + MySQL. **Live URL:** http://68.183.235.74

**Q: Does GitHub count as deployment?**  
**A:** **No.** GitHub stores code. The VPS runs the live app.

**Q: What should I write on the poster about deployment?**  
**A:** *“Deployed with Docker Compose (Nginx + Spring Boot + MySQL) on DigitalOcean VPS — http://68.183.235.74”*

**Q: What if the site is down at PamerKom?**  
**A:** Demo the same stack on your laptop with `docker compose up`, or use a backup demo video.

---

*Draft for PamerKom 2026. Live demo: http://68.183.235.74 — update author names and screenshot paths before printing.*
