from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.security import get_current_user, require_roles
from app.models.user import User
from app.models.driver import Driver
from app.models.enums import UserRole, DriverStatus
from app.schemas import DriverCreate, DriverUpdate, DriverOut, MessageOut
from app.services.reminders import send_license_expiry_reminders

router = APIRouter(prefix="/api/drivers", tags=["drivers"])


def _to_out(driver: Driver) -> dict:
    return {
        "id": driver.id,
        "full_name": driver.full_name,
        "license_number": driver.license_number,
        "license_category": driver.license_category,
        "license_expiry": driver.license_expiry,
        "contact_number": driver.contact_number,
        "safety_score": driver.safety_score,
        "status": driver.status.value,
        "region": driver.region,
        "license_expired": driver.license_expiry < date.today(),
    }


@router.get("", response_model=List[DriverOut])
def list_drivers(
    status: Optional[str] = None,
    available_only: bool = False,
    expiring_soon: bool = False,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Driver)
    if status:
        query = query.filter(Driver.status == status)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (Driver.full_name.ilike(like)) | (Driver.license_number.ilike(like))
        )
    if available_only:
        query = query.filter(
            Driver.status == DriverStatus.available,
            Driver.license_expiry >= date.today(),
        )
    drivers = query.order_by(Driver.full_name).all()
    if expiring_soon:
        drivers = [
            d for d in drivers if 0 <= (d.license_expiry - date.today()).days <= 30
        ]
    return [_to_out(d) for d in drivers]


@router.post("", response_model=DriverOut, status_code=201)
def create_driver(
    payload: DriverCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.fleet_manager, UserRole.safety_officer)),
):
    exists = (
        db.query(Driver)
        .filter(Driver.license_number == payload.license_number)
        .first()
    )
    if exists:
        raise HTTPException(status_code=400, detail="License number must be unique")

    driver = Driver(
        full_name=payload.full_name,
        license_number=payload.license_number,
        license_category=payload.license_category,
        license_expiry=payload.license_expiry,
        contact_number=payload.contact_number,
        safety_score=payload.safety_score,
        status=DriverStatus(payload.status),
        region=payload.region,
    )
    db.add(driver)
    db.commit()
    db.refresh(driver)
    return _to_out(driver)


@router.post("/reminders/license-expiry", response_model=MessageOut)
def trigger_license_reminders(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin, UserRole.safety_officer, UserRole.fleet_manager)),
):
    result = send_license_expiry_reminders(db)
    return MessageOut(message=result["message"])


@router.get("/{driver_id}", response_model=DriverOut)
def get_driver(
    driver_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return _to_out(driver)


@router.patch("/{driver_id}", response_model=DriverOut)
def update_driver(
    driver_id: int,
    payload: DriverUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.fleet_manager, UserRole.safety_officer)),
):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    data = payload.model_dump(exclude_unset=True)
    if "status" in data:
        data["status"] = DriverStatus(data["status"])
    for key, value in data.items():
        setattr(driver, key, value)

    db.commit()
    db.refresh(driver)
    return _to_out(driver)
