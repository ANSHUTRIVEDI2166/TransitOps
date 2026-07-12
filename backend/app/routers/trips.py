from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.security import get_current_user, require_roles
from app.models.user import User
from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.enums import UserRole
from app.schemas import TripCreate, TripComplete, TripOut
from app.services.trip_service import TripService

router = APIRouter(prefix="/api/trips", tags=["trips"])


def _to_out(db: Session, trip: Trip) -> dict:
    vehicle = db.query(Vehicle).filter(Vehicle.id == trip.vehicle_id).first()
    driver = db.query(Driver).filter(Driver.id == trip.driver_id).first()
    return {
        "id": trip.id,
        "source": trip.source,
        "destination": trip.destination,
        "vehicle_id": trip.vehicle_id,
        "driver_id": trip.driver_id,
        "cargo_weight_kg": trip.cargo_weight_kg,
        "planned_distance_km": trip.planned_distance_km,
        "actual_distance_km": trip.actual_distance_km,
        "fuel_consumed_liters": trip.fuel_consumed_liters,
        "final_odometer_km": trip.final_odometer_km,
        "revenue": trip.revenue,
        "status": trip.status.value,
        "notes": trip.notes,
        "created_at": trip.created_at,
        "dispatched_at": trip.dispatched_at,
        "completed_at": trip.completed_at,
        "vehicle_reg": vehicle.registration_number if vehicle else None,
        "driver_name": driver.full_name if driver else None,
    }


@router.get("", response_model=List[TripOut])
def list_trips(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Trip)
    if status:
        query = query.filter(Trip.status == status)
    trips = query.order_by(Trip.created_at.desc()).all()
    return [_to_out(db, t) for t in trips]


@router.post("", response_model=TripOut, status_code=201)
def create_trip(
    payload: TripCreate,
    db: Session = Depends(get_db),
    user: User = Depends(
        require_roles(UserRole.fleet_manager, UserRole.dispatcher)
    ),
):
    trip = TripService.create_trip(db, payload, user.id)
    return _to_out(db, trip)


@router.post("/{trip_id}/dispatch", response_model=TripOut)
def dispatch_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.fleet_manager, UserRole.dispatcher)),
):
    trip = TripService.dispatch(db, trip_id)
    return _to_out(db, trip)


@router.post("/{trip_id}/complete", response_model=TripOut)
def complete_trip(
    trip_id: int,
    payload: TripComplete,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.fleet_manager, UserRole.dispatcher)),
):
    trip = TripService.complete(db, trip_id, payload)
    return _to_out(db, trip)


@router.post("/{trip_id}/cancel", response_model=TripOut)
def cancel_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.fleet_manager, UserRole.dispatcher)),
):
    trip = TripService.cancel(db, trip_id)
    return _to_out(db, trip)


@router.get("/{trip_id}", response_model=TripOut)
def get_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return _to_out(db, trip)
