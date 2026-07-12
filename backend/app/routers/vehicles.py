from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.security import get_current_user, require_roles
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.enums import UserRole, VehicleStatus, VehicleType
from app.schemas import VehicleCreate, VehicleUpdate, VehicleOut

router = APIRouter(prefix="/api/vehicles", tags=["vehicles"])


def _enum_value(model):
    data = VehicleOut.model_validate(model).model_dump()
    data["vehicle_type"] = model.vehicle_type.value
    data["status"] = model.status.value
    return data


@router.get("", response_model=List[VehicleOut])
def list_vehicles(
    status: Optional[str] = None,
    vehicle_type: Optional[str] = None,
    region: Optional[str] = None,
    q: Optional[str] = None,
    available_only: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Vehicle)
    if status:
        query = query.filter(Vehicle.status == status)
    if vehicle_type:
        query = query.filter(Vehicle.vehicle_type == vehicle_type)
    if region:
        query = query.filter(Vehicle.region == region)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (Vehicle.registration_number.ilike(like)) | (Vehicle.name.ilike(like))
        )
    if available_only:
        query = query.filter(Vehicle.status == VehicleStatus.available)
    return [_enum_value(v) for v in query.order_by(Vehicle.registration_number).all()]


@router.post("", response_model=VehicleOut, status_code=201)
def create_vehicle(
    payload: VehicleCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.fleet_manager)),
):
    exists = (
        db.query(Vehicle)
        .filter(Vehicle.registration_number == payload.registration_number)
        .first()
    )
    if exists:
        raise HTTPException(status_code=400, detail="Registration number must be unique")

    try:
        vtype = VehicleType(payload.vehicle_type)
        vstatus = VehicleStatus(payload.status)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    vehicle = Vehicle(
        registration_number=payload.registration_number,
        name=payload.name,
        vehicle_type=vtype,
        max_load_kg=payload.max_load_kg,
        odometer_km=payload.odometer_km,
        acquisition_cost=payload.acquisition_cost,
        status=vstatus,
        region=payload.region,
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return _enum_value(vehicle)


@router.get("/{vehicle_id}", response_model=VehicleOut)
def get_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return _enum_value(vehicle)


@router.patch("/{vehicle_id}", response_model=VehicleOut)
def update_vehicle(
    vehicle_id: int,
    payload: VehicleUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.fleet_manager)),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    data = payload.model_dump(exclude_unset=True)
    if "vehicle_type" in data:
        data["vehicle_type"] = VehicleType(data["vehicle_type"])
    if "status" in data:
        data["status"] = VehicleStatus(data["status"])

    for key, value in data.items():
        setattr(vehicle, key, value)

    db.commit()
    db.refresh(vehicle)
    return _enum_value(vehicle)


@router.delete("/{vehicle_id}", status_code=204)
def delete_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.fleet_manager)),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    vehicle.status = VehicleStatus.retired
    db.commit()
    return None
