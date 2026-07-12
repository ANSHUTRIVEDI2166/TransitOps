from contextlib import asynccontextmanager
import threading
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine, SessionLocal
from app import models  # noqa: F401
from app.db_bootstrap import ensure_schema
from app.seed import seed_database
from app.services.reminders import send_license_expiry_reminders
from app.routers import (
    auth,
    vehicles,
    drivers,
    trips,
    maintenance,
    expenses,
    dashboard,
    users,
    documents,
)


def _reminder_loop():
    # Recheck every 24 hours while the API is running
    while True:
        time.sleep(24 * 60 * 60)
        db = SessionLocal()
        try:
            send_license_expiry_reminders(db)
        except Exception:
            pass
        finally:
            db.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_schema()
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

    worker = threading.Thread(target=_reminder_loop, daemon=True)
    worker.start()
    yield


app = FastAPI(
    title="TransitOps API",
    description="Smart Transport Operations Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(vehicles.router)
app.include_router(documents.router)
app.include_router(drivers.router)
app.include_router(trips.router)
app.include_router(maintenance.router)
app.include_router(expenses.router)
app.include_router(dashboard.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "TransitOps"}
