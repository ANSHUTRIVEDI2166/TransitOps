from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.security import get_current_user, require_roles
from app.models.user import User
from app.models.maintenance import MaintenanceLog
from app.models.vehicle import Vehicle
from app.models.enums import UserRole
from app.schemas import MaintenanceCreate, MaintenanceOut
from app.services.trip_service import MaintenanceService

router = APIRouter(prefix="/api/maintenance", tags=["maintenance"])


def _to_out(db: Session, log: MaintenanceLog) -> dict:
    vehicle = db.query(Vehicle).filter(Vehicle.id == log.vehicle_id).first()
    return {
        "id": log.id,
        "vehicle_id": log.vehicle_id,
        "title": log.title,
        "description": log.description,
        "cost": log.cost,
        "service_date": log.service_date,
        "status": log.status.value,
        "created_at": log.created_at,
        "closed_at": log.closed_at,
        "vehicle_reg": vehicle.registration_number if vehicle else None,
    }


@router.get("", response_model=List[MaintenanceOut])
def list_maintenance(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    logs = db.query(MaintenanceLog).order_by(MaintenanceLog.created_at.desc()).all()
    return [_to_out(db, log) for log in logs]


@router.post("", response_model=MaintenanceOut, status_code=201)
def create_maintenance(
    payload: MaintenanceCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.fleet_manager)),
):
    log = MaintenanceService.open_log(db, payload)
    return _to_out(db, log)


@router.post("/{log_id}/close", response_model=MaintenanceOut)
def close_maintenance(
    log_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.fleet_manager)),
):
    log = MaintenanceService.close_log(db, log_id)
    return _to_out(db, log)
