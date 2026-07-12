from datetime import date, datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip
from app.models.maintenance import MaintenanceLog
from app.models.fuel import FuelLog
from app.models.expense import Expense
from app.models.enums import (
    VehicleStatus,
    DriverStatus,
    TripStatus,
    MaintenanceStatus,
    ExpenseCategory,
)


class TripService:
    @staticmethod
    def _get_vehicle(db: Session, vehicle_id: int) -> Vehicle:
        vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        return vehicle

    @staticmethod
    def _get_driver(db: Session, driver_id: int) -> Driver:
        driver = db.query(Driver).filter(Driver.id == driver_id).first()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver not found")
        return driver

    @staticmethod
    def validate_assignment(
        db: Session,
        vehicle: Vehicle,
        driver: Driver,
        cargo_weight_kg: Decimal,
        *,
        for_dispatch: bool = False,
    ) -> None:
        if vehicle.status in (VehicleStatus.retired, VehicleStatus.in_shop):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Retired or in-shop vehicles cannot be assigned to trips",
            )
        if vehicle.status == VehicleStatus.on_trip and for_dispatch:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vehicle is already on a trip",
            )
        if for_dispatch and vehicle.status != VehicleStatus.available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vehicle must be available to dispatch",
            )

        if driver.status == DriverStatus.suspended:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Suspended drivers cannot be assigned to trips",
            )
        if driver.license_expiry < date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Driver license has expired",
            )
        if driver.status == DriverStatus.on_trip and for_dispatch:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Driver is already on a trip",
            )
        if for_dispatch and driver.status != DriverStatus.available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Driver must be available to dispatch",
            )

        if cargo_weight_kg > vehicle.max_load_kg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cargo weight exceeds vehicle capacity ({vehicle.max_load_kg} kg)",
            )

    @classmethod
    def create_trip(cls, db: Session, data, user_id: int) -> Trip:
        vehicle = cls._get_vehicle(db, data.vehicle_id)
        driver = cls._get_driver(db, data.driver_id)
        cls.validate_assignment(db, vehicle, driver, data.cargo_weight_kg, for_dispatch=False)

        if vehicle.status != VehicleStatus.available:
            raise HTTPException(status_code=400, detail="Only available vehicles can be selected")
        if driver.status != DriverStatus.available:
            raise HTTPException(status_code=400, detail="Only available drivers can be selected")

        trip = Trip(
            source=data.source,
            destination=data.destination,
            vehicle_id=vehicle.id,
            driver_id=driver.id,
            cargo_weight_kg=data.cargo_weight_kg,
            planned_distance_km=data.planned_distance_km,
            revenue=data.revenue,
            notes=data.notes,
            status=TripStatus.draft,
            created_by=user_id,
        )
        db.add(trip)
        db.commit()
        db.refresh(trip)
        return trip

    @classmethod
    def dispatch(cls, db: Session, trip_id: int) -> Trip:
        trip = db.query(Trip).filter(Trip.id == trip_id).first()
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")
        if trip.status != TripStatus.draft:
            raise HTTPException(status_code=400, detail="Only draft trips can be dispatched")

        vehicle = cls._get_vehicle(db, trip.vehicle_id)
        driver = cls._get_driver(db, trip.driver_id)
        cls.validate_assignment(
            db, vehicle, driver, trip.cargo_weight_kg, for_dispatch=True
        )

        trip.status = TripStatus.dispatched
        trip.dispatched_at = datetime.utcnow()
        vehicle.status = VehicleStatus.on_trip
        driver.status = DriverStatus.on_trip
        db.commit()
        db.refresh(trip)
        return trip

    @classmethod
    def complete(cls, db: Session, trip_id: int, data) -> Trip:
        trip = db.query(Trip).filter(Trip.id == trip_id).first()
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")
        if trip.status != TripStatus.dispatched:
            raise HTTPException(status_code=400, detail="Only dispatched trips can be completed")

        vehicle = cls._get_vehicle(db, trip.vehicle_id)
        driver = cls._get_driver(db, trip.driver_id)

        if data.final_odometer_km < vehicle.odometer_km:
            raise HTTPException(
                status_code=400,
                detail="Final odometer cannot be less than current vehicle odometer",
            )

        distance = data.final_odometer_km - vehicle.odometer_km
        trip.final_odometer_km = data.final_odometer_km
        trip.fuel_consumed_liters = data.fuel_consumed_liters
        trip.actual_distance_km = distance
        trip.status = TripStatus.completed
        trip.completed_at = datetime.utcnow()

        vehicle.odometer_km = data.final_odometer_km
        vehicle.status = VehicleStatus.available
        driver.status = DriverStatus.available

        if data.fuel_consumed_liters > 0:
            fuel = FuelLog(
                vehicle_id=vehicle.id,
                trip_id=trip.id,
                liters=data.fuel_consumed_liters,
                cost=data.fuel_cost,
                log_date=date.today(),
                odometer_km=data.final_odometer_km,
                notes=f"Auto-logged from trip #{trip.id}",
            )
            db.add(fuel)
            if data.fuel_cost > 0:
                db.add(
                    Expense(
                        vehicle_id=vehicle.id,
                        category=ExpenseCategory.fuel,
                        amount=data.fuel_cost,
                        expense_date=date.today(),
                        description=f"Fuel for trip #{trip.id}",
                        reference_id=trip.id,
                    )
                )

        db.commit()
        db.refresh(trip)
        return trip

    @classmethod
    def cancel(cls, db: Session, trip_id: int) -> Trip:
        trip = db.query(Trip).filter(Trip.id == trip_id).first()
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")
        if trip.status not in (TripStatus.draft, TripStatus.dispatched):
            raise HTTPException(status_code=400, detail="Trip cannot be cancelled")

        if trip.status == TripStatus.dispatched:
            vehicle = cls._get_vehicle(db, trip.vehicle_id)
            driver = cls._get_driver(db, trip.driver_id)
            vehicle.status = VehicleStatus.available
            driver.status = DriverStatus.available

        trip.status = TripStatus.cancelled
        trip.cancelled_at = datetime.utcnow()
        db.commit()
        db.refresh(trip)
        return trip


class MaintenanceService:
    @staticmethod
    def open_log(db: Session, data) -> MaintenanceLog:
        vehicle = db.query(Vehicle).filter(Vehicle.id == data.vehicle_id).first()
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        if vehicle.status == VehicleStatus.retired:
            raise HTTPException(status_code=400, detail="Cannot maintain a retired vehicle")
        if vehicle.status == VehicleStatus.on_trip:
            raise HTTPException(status_code=400, detail="Vehicle is currently on a trip")

        log = MaintenanceLog(
            vehicle_id=vehicle.id,
            title=data.title,
            description=data.description,
            cost=data.cost,
            service_date=data.service_date,
            status=MaintenanceStatus.open,
        )
        vehicle.status = VehicleStatus.in_shop
        db.add(log)

        if data.cost > 0:
            db.add(
                Expense(
                    vehicle_id=vehicle.id,
                    category=ExpenseCategory.maintenance,
                    amount=data.cost,
                    expense_date=data.service_date,
                    description=data.title,
                )
            )

        db.commit()
        db.refresh(log)
        return log

    @staticmethod
    def close_log(db: Session, log_id: int) -> MaintenanceLog:
        log = db.query(MaintenanceLog).filter(MaintenanceLog.id == log_id).first()
        if not log:
            raise HTTPException(status_code=404, detail="Maintenance log not found")
        if log.status != MaintenanceStatus.open:
            raise HTTPException(status_code=400, detail="Maintenance log is already closed")

        vehicle = db.query(Vehicle).filter(Vehicle.id == log.vehicle_id).first()
        log.status = MaintenanceStatus.closed
        log.closed_at = datetime.utcnow()

        if vehicle and vehicle.status != VehicleStatus.retired:
            open_count = (
                db.query(MaintenanceLog)
                .filter(
                    MaintenanceLog.vehicle_id == vehicle.id,
                    MaintenanceLog.status == MaintenanceStatus.open,
                    MaintenanceLog.id != log.id,
                )
                .count()
            )
            if open_count == 0:
                vehicle.status = VehicleStatus.available

        db.commit()
        db.refresh(log)
        return log
