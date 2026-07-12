# TransitOps

Smart Transport Operations Platform — Odoo Hackathon 2026 (Virtual Round)

## Idea

Logistics teams still run fleets on spreadsheets. TransitOps is our plan to digitize the full ops loop in one place: vehicles, drivers, dispatch, maintenance, fuel/expenses, and reporting — with hard business rules so bad assignments can’t slip through.

## Planned stack

| Layer | Tech | Owner |
|-------|------|--------|
| Frontend | React + modern CSS | Anshu |
| Backend | FastAPI | Jugal |
| Database | PostgreSQL | Hriday |

## What we plan to build

- Auth with role-based access (fleet, dispatch, safety, finance)
- Operations dashboard with KPIs and filters
- Vehicle registry + driver management
- Trip lifecycle: Draft → Dispatched → Completed / Cancelled
- Automatic status updates for vehicles and drivers
- Maintenance workflow (In Shop removes vehicles from dispatch)
- Fuel & expense tracking
- Reports: utilization, fuel efficiency, operational cost, ROI
- CSV export (PDF later if time allows)

## Core rules we will enforce

- Unique vehicle registration
- No dispatch for retired / in-shop / already on-trip assets
- No assignment for expired licenses or suspended drivers
- Cargo weight cannot exceed vehicle capacity
- Status flips on dispatch, complete, cancel, and maintenance open/close

## Team split

- **Anshu** — UI/UX, React pages, API integration
- **Jugal** — FastAPI, business logic, REST contracts
- **Hriday** — schema, migrations, queries

## Status

Early planning / scaffolding stage. Detailed setup notes will land as modules ship.
