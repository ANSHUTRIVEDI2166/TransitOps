from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import String, Numeric, Enum, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.enums import VehicleStatus, VehicleType


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(primary_key=True)
    registration_number: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    vehicle_type: Mapped[VehicleType] = mapped_column(Enum(VehicleType, name="vehicle_type"))
    max_load_kg: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    odometer_km: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    acquisition_cost: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    status: Mapped[VehicleStatus] = mapped_column(
        Enum(VehicleStatus, name="vehicle_status"),
        default=VehicleStatus.available,
        index=True,
    )
    region: Mapped[Optional[str]] = mapped_column(String(80), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
