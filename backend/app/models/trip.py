from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import String, Numeric, Enum, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.enums import TripStatus


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[int] = mapped_column(primary_key=True)
    source: Mapped[str] = mapped_column(String(200))
    destination: Mapped[str] = mapped_column(String(200))
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"), index=True)
    driver_id: Mapped[int] = mapped_column(ForeignKey("drivers.id"), index=True)
    cargo_weight_kg: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    planned_distance_km: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    actual_distance_km: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    fuel_consumed_liters: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    final_odometer_km: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    revenue: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    status: Mapped[TripStatus] = mapped_column(
        Enum(TripStatus, name="trip_status"),
        default=TripStatus.draft,
        index=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    dispatched_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
