from decimal import Decimal
from typing import Optional

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
