from datetime import datetime, date
from decimal import Decimal
from typing import Optional

from sqlalchemy import String, Numeric, Enum, DateTime, Date
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.enums import DriverStatus


class Driver(Base):
    __tablename__ = "drivers"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120))
    license_number: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    license_category: Mapped[str] = mapped_column(String(32))
    license_expiry: Mapped[date] = mapped_column(Date)
    contact_number: Mapped[str] = mapped_column(String(32))
    safety_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=100)
    status: Mapped[DriverStatus] = mapped_column(
        Enum(DriverStatus, name="driver_status"),
        default=DriverStatus.available,
        index=True,
    )
    region: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
