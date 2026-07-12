from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip
from app.models.fuel import FuelLog
from app.models.maintenance import MaintenanceLog
from app.models.enums import VehicleStatus, DriverStatus, TripStatus
from app.schemas import DashboardKPI, VehicleAnalytics, AnalyticsSummary


def get_dashboard_kpis(
    db: Session,
    vehicle_type: Optional[str] = None,
    status: Optional[str] = None,
    region: Optional[str] = None,
) -> DashboardKPI:
    vq = db.query(Vehicle)
    if vehicle_type:
        vq = vq.filter(Vehicle.vehicle_type == vehicle_type)
    if status:
        vq = vq.filter(Vehicle.status == status)
    if region:
        vq = vq.filter(Vehicle.region == region)

    vehicles = vq.all()
    total = len(vehicles) or 1
    active = sum(1 for v in vehicles if v.status != VehicleStatus.retired)
    available = sum(1 for v in vehicles if v.status == VehicleStatus.available)
    in_shop = sum(1 for v in vehicles if v.status == VehicleStatus.in_shop)
    on_trip_vehicles = sum(1 for v in vehicles if v.status == VehicleStatus.on_trip)

    active_trips = db.query(Trip).filter(Trip.status == TripStatus.dispatched).count()
    pending_trips = db.query(Trip).filter(Trip.status == TripStatus.draft).count()
    drivers_on_duty = (
        db.query(Driver).filter(Driver.status == DriverStatus.on_trip).count()
    )

    utilization = round((on_trip_vehicles / total) * 100, 1) if vehicles else 0.0

    return DashboardKPI(
        active_vehicles=active,
        available_vehicles=available,
        vehicles_in_maintenance=in_shop,
        active_trips=active_trips,
        pending_trips=pending_trips,
        drivers_on_duty=drivers_on_duty,
        fleet_utilization_pct=utilization,
    )


def get_analytics(db: Session) -> AnalyticsSummary:
    vehicles = db.query(Vehicle).all()
    rows = []
    total_fuel = Decimal("0")
    total_maint = Decimal("0")
    eff_values = []

    for v in vehicles:
        fuel_cost = (
            db.query(func.coalesce(func.sum(FuelLog.cost), 0))
            .filter(FuelLog.vehicle_id == v.id)
            .scalar()
        )
        fuel_liters = (
            db.query(func.coalesce(func.sum(FuelLog.liters), 0))
            .filter(FuelLog.vehicle_id == v.id)
            .scalar()
        )
        maint_cost = (
            db.query(func.coalesce(func.sum(MaintenanceLog.cost), 0))
            .filter(MaintenanceLog.vehicle_id == v.id)
            .scalar()
        )
        revenue = (
            db.query(func.coalesce(func.sum(Trip.revenue), 0))
            .filter(Trip.vehicle_id == v.id, Trip.status == TripStatus.completed)
            .scalar()
        )
        distance = (
            db.query(func.coalesce(func.sum(Trip.actual_distance_km), 0))
            .filter(Trip.vehicle_id == v.id, Trip.status == TripStatus.completed)
            .scalar()
        )

        fuel_cost = Decimal(str(fuel_cost))
        maint_cost = Decimal(str(maint_cost))
        revenue = Decimal(str(revenue))
        distance = float(distance or 0)
        liters = float(fuel_liters or 0)

        efficiency = (distance / liters) if liters > 0 else None
        if efficiency is not None:
            eff_values.append(efficiency)

        acquisition = Decimal(str(v.acquisition_cost or 0))
        roi = None
        if acquisition > 0:
            roi = float((revenue - (maint_cost + fuel_cost)) / acquisition)

        total_fuel += fuel_cost
        total_maint += maint_cost

        rows.append(
            VehicleAnalytics(
                vehicle_id=v.id,
                registration_number=v.registration_number,
                name=v.name,
                fuel_efficiency=round(efficiency, 2) if efficiency is not None else None,
                operational_cost=float(fuel_cost + maint_cost),
                fuel_cost=float(fuel_cost),
                maintenance_cost=float(maint_cost),
                revenue=float(revenue),
                roi=round(roi, 4) if roi is not None else None,
                acquisition_cost=float(acquisition),
                total_distance=round(distance, 2),
            )
        )

    on_trip = sum(1 for v in vehicles if v.status == VehicleStatus.on_trip)
    util = round((on_trip / len(vehicles)) * 100, 1) if vehicles else 0.0
    avg_eff = round(sum(eff_values) / len(eff_values), 2) if eff_values else None

    return AnalyticsSummary(
        fleet_utilization_pct=util,
        total_operational_cost=float(total_fuel + total_maint),
        total_fuel_cost=float(total_fuel),
        total_maintenance_cost=float(total_maint),
        avg_fuel_efficiency=avg_eff,
        vehicles=rows,
    )


def get_home_overview(
    db: Session,
    vehicle_type: Optional[str] = None,
    status: Optional[str] = None,
    region: Optional[str] = None,
) -> Dict[str, Any]:
    """Single payload for the homepage dashboard."""
    kpis = get_dashboard_kpis(db, vehicle_type, status, region)

    vq = db.query(Vehicle.status, func.count(Vehicle.id)).group_by(Vehicle.status)
    if vehicle_type:
        vq = vq.filter(Vehicle.vehicle_type == vehicle_type)
    if status:
        vq = vq.filter(Vehicle.status == status)
    if region:
        vq = vq.filter(Vehicle.region == region)
    fleet_mix = [
        {"name": s.value.replace("_", " "), "value": int(c)} for s, c in vq.all()
    ]

    trip_mix = [
        {"name": s.value, "trips": int(c)}
        for s, c in db.query(Trip.status, func.count(Trip.id))
        .group_by(Trip.status)
        .all()
    ]

    live_rows = (
        db.query(
            Trip.id,
            Trip.source,
            Trip.destination,
            Trip.status,
            Vehicle.registration_number,
            Driver.full_name,
        )
        .outerjoin(Vehicle, Vehicle.id == Trip.vehicle_id)
        .outerjoin(Driver, Driver.id == Trip.driver_id)
        .filter(Trip.status == TripStatus.dispatched)
        .order_by(Trip.id.desc())
        .limit(5)
        .all()
    )
    live_trips: List[Dict[str, Any]] = [
        {
            "id": row.id,
            "source": row.source,
            "destination": row.destination,
            "status": row.status.value,
            "vehicle_reg": row.registration_number,
            "driver_name": row.full_name,
        }
        for row in live_rows
    ]

    today = date.today()
    expiring = (
        db.query(Driver)
        .filter(
            Driver.license_expiry >= today,
            Driver.license_expiry <= today + timedelta(days=30),
        )
        .order_by(Driver.license_expiry.asc())
        .limit(6)
        .all()
    )
    license_watch = [
        {
            "id": d.id,
            "full_name": d.full_name,
            "license_expiry": d.license_expiry.isoformat(),
            "safety_score": float(d.safety_score),
            "status": d.status.value,
        }
        for d in expiring
    ]

    fuel_total = db.query(func.coalesce(func.sum(FuelLog.cost), 0)).scalar()
    maint_total = db.query(func.coalesce(func.sum(MaintenanceLog.cost), 0)).scalar()
    ops_cost = float(Decimal(str(fuel_total)) + Decimal(str(maint_total)))

    return {
        "kpis": kpis,
        "fleet_mix": fleet_mix,
        "trip_mix": trip_mix,
        "live_trips": live_trips,
        "license_watch": license_watch,
        "ops_cost": ops_cost,
    }
