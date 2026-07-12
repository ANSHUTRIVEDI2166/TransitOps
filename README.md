# TransitOps

**Smart Transport Operations Platform** · Odoo Hackathon 2026

One system for the full fleet loop — vehicles, drivers, dispatch, shop, costs, and analytics — with hard business rules so bad assignments never leave the yard.

---

## Problem

Most logistics teams still run operations on spreadsheets and chat threads. That creates:

- Double-booked vehicles and drivers  
- Dispatch of retired / in-shop assets  
- Blind spots on fuel, maintenance, and ROI  
- No role-based control over who can touch what  

TransitOps replaces that chaos with a single source of truth.

---

## Solution

A full-stack ops console where every action updates status automatically:

| Flow | What happens |
|------|----------------|
| **Draft → Dispatched** | Vehicle & driver move to *on trip* |
| **Dispatched → Completed** | Assets free up; fuel can be logged |
| **Maintenance open** | Vehicle goes *in shop* — blocked from dispatch |
| **Maintenance close** | Vehicle returns to *available* |

---

## Features

### Operations
- Role-aware **home dashboard** (KPIs, fleet mix, live trips, license watch)
- **Vehicle registry** with regions, capacity, acquisition cost, documents
- **Driver management** with license expiry + safety scores
- **Dispatch desk** — create, dispatch, complete, or cancel trips
- **Shop** — open/close maintenance with cost tracking
- **Fuel & expenses** — tolls, fuel, and other spend in one place

### Intelligence
- Fleet utilization, fuel efficiency, operational cost, and **ROI per vehicle**
- Charts for cost vs revenue, efficiency, and spend mix
- **CSV + PDF** analytics export

### Platform
- JWT auth + **RBAC** (5 roles)
- Admin user invites over **SMTP** (credentials emailed)
- Forgot / reset password + in-app change password
- Vehicle **document upload**
- Background **license expiry reminders**
- Light / dark theme

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, React Router, Recharts |
| Backend | FastAPI, SQLAlchemy, Pydantic, JWT |
| Database | PostgreSQL |
| Export | CSV, ReportLab PDF |
| Email | SMTP (Gmail App Password) |

---

## Roles & access

| Role | Home focus | Can access |
|------|------------|------------|
| **Admin** | Command center | Everything + Users |
| **Fleet Manager** | Fleet operations | Fleet, drivers, dispatch, shop, costs, insights |
| **Dispatcher** | Dispatch desk | Fleet, drivers, trips |
| **Safety Officer** | Safety desk | Drivers, license watch |
| **Financial Analyst** | Finance overview | Costs, insights |

Nav and API routes are filtered by role — users only see what they should.

---

## Business rules (enforced in API)

- Unique vehicle registration numbers  
- No dispatch if vehicle is *retired*, *in shop*, or already *on trip*  
- No assignment if driver license is expired or status is suspended  
- Cargo weight cannot exceed vehicle `max_load_kg`  
- Status flips automatically on dispatch / complete / cancel / maintenance open–close  
- Completed trips can attach fuel consumption + cost  

---

## Project structure

```
TransitOps/
├── backend/                 # FastAPI API
│   ├── app/
│   │   ├── auth/            # JWT + password hashing
│   │   ├── models/          # SQLAlchemy models
│   │   ├── routers/         # REST endpoints
│   │   ├── schemas/         # Pydantic contracts
│   │   ├── services/        # Trip rules, analytics, email, PDF, reminders
│   │   ├── seed.py          # Demo admin + sample data
│   │   └── main.py
│   ├── alembic/             # Schema SQL
│   ├── requirements.txt
│   └── .env.example
├── frontend/                # React SPA
│   ├── src/
│   │   ├── pages/           # Home, Fleet, Drivers, Dispatch, Shop, Costs, Insights, Users
│   │   ├── components/      # Shell, charts, pagination, UI
│   │   ├── api/             # API client
│   │   └── lib/roles.js     # RBAC map
│   └── .env.example
└── README.md
```

---

## Quick start

### Prerequisites
- Python 3.10+  
- Node.js 18+  
- PostgreSQL (local / pgAdmin)  
- Gmail App Password (for invites & password reset)

### 1. Database

Create a database named `transitops` in PostgreSQL.

### 2. Backend

```bash
cd backend
python -m venv .venv

# Windows
.\.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env          # Windows
# cp .env.example .env          # macOS / Linux
```

Edit `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg2://postgres:YOUR_PASSWORD@localhost:5432/transitops
SECRET_KEY=any-long-random-string
CORS_ORIGINS=http://localhost:5173
FRONTEND_URL=http://localhost:5173

ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=ChangeMeAdmin123!
ADMIN_FULL_NAME=System Admin

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USE_TLS=true
SMTP_USER=your-gmail@gmail.com
SMTP_PASSWORD=your-16-char-app-password
```

Run the API:

```bash
uvicorn app.main:app --reload --port 8000
```

- API docs: http://localhost:8000/docs  
- On first boot the app creates tables and seeds the admin user from `.env`

### 3. Frontend

```bash
cd frontend
npm install
copy .env.example .env          # Windows
# cp .env.example .env          # macOS / Linux
```

`frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

```bash
npm run dev
```

Open http://localhost:5173 and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

---

## Demo walkthrough (judges)

1. **Login** as admin → land on role-aware Home with live KPIs  
2. **Fleet** → register / inspect vehicles; upload a document  
3. **Drivers** → add a driver; note license expiry + safety score  
4. **Dispatch** → create a draft trip → **Dispatch** → watch status flip  
5. **Complete** a trip with fuel used → see cost flow into Costs / Insights  
6. **Shop** → open maintenance → vehicle blocked from new dispatch  
7. **Insights** → utilization, cost vs revenue, ROI → export CSV / PDF  
8. **Users** → invite a role (SMTP); try role-filtered nav as that user  
9. **Settings** → change password; toggle light / dark theme  

---

## API surface (high level)

| Area | Endpoints |
|------|-----------|
| Auth | login, me, forgot/reset/change password |
| Users | CRUD-style invite, deactivate, resend credentials |
| Fleet | vehicles CRUD + document upload/download |
| Drivers | drivers CRUD + license reminder trigger |
| Trips | create, dispatch, complete, cancel |
| Shop | open / close maintenance |
| Costs | fuel logs + expenses |
| Dashboard | KPIs, home overview, analytics, CSV/PDF export |

Interactive docs: **`/docs`** while the API is running.

---

## Team

| Member | Ownership |
|--------|-----------|
| **Anshu** | React UI/UX, RBAC nav, charts, API integration |
| **Jugal** | FastAPI, auth, business rules, services, exports |
| **Hriday** | PostgreSQL schema, models alignment, migrations |

---

## What we optimized for

- **Correctness first** — dispatch and shop rules live in the API, not only the UI  
- **Role clarity** — every screen is scoped to the job to be done  
- **Judge-ready UX** — fast home overview, skeletons while loading, charts that tell a story  
- **Operability** — seed admin, SMTP invites, password reset, document vault  

---

## License

Built for **Odoo Hackathon 2026** · team project.
