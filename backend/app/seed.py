from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.auth.security import hash_password
from app.config import settings
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.enums import UserRole, VehicleType, VehicleStatus, DriverStatus

DEMO_EMAILS = [
    "manager@transitops.com",
    "dispatch@transitops.com",
    "safety@transitops.com",
    "finance@transitops.com",
]


def seed_database(db: Session) -> None:
    # Remove old hackathon demo logins if present
    db.query(User).filter(User.email.in_(DEMO_EMAILS)).delete(synchronize_session=False)

    admin = db.query(User).filter(User.email == settings.ADMIN_EMAIL.lower()).first()
    if not admin:
        db.add(
            User(
                email=settings.ADMIN_EMAIL.lower(),
                full_name=settings.ADMIN_FULL_NAME,
                hashed_password=hash_password(settings.ADMIN_PASSWORD),
                role=UserRole.admin,
                is_active=True,
            )
        )
    elif admin.role != UserRole.admin:
        admin.role = UserRole.admin
        admin.is_active = True

    if not db.query(Vehicle).first():
        db.add_all(
            [
                Vehicle(
                    registration_number="Van-05",
                    name="Mercedes Sprinter",
                    vehicle_type=VehicleType.van,
                    max_load_kg=Decimal("500"),
                    odometer_km=Decimal("12450"),
                    acquisition_cost=Decimal("1850000"),
                    status=VehicleStatus.available,
                    region="West",
                ),
                Vehicle(
                    registration_number="TRK-12",
                    name="Tata 407",
                    vehicle_type=VehicleType.truck,
                    max_load_kg=Decimal("2500"),
                    odometer_km=Decimal("48200"),
                    acquisition_cost=Decimal("2200000"),
                    status=VehicleStatus.available,
                    region="North",
                ),
                Vehicle(
                    registration_number="VAN-08",
                    name="Force Traveller",
                    vehicle_type=VehicleType.van,
                    max_load_kg=Decimal("800"),
                    odometer_km=Decimal("22100"),
                    acquisition_cost=Decimal("1450000"),
                    status=VehicleStatus.available,
                    region="South",
                ),
                Vehicle(
                    registration_number="TRL-03",
                    name="Ashok Leyland Trailer",
                    vehicle_type=VehicleType.trailer,
                    max_load_kg=Decimal("12000"),
                    odometer_km=Decimal("91000"),
                    acquisition_cost=Decimal("4500000"),
                    status=VehicleStatus.in_shop,
                    region="West",
                ),
            ]
        )

    if not db.query(Driver).first():
        db.add_all(
            [
                Driver(
                    full_name="Alex Fernandes",
                    license_number="MH-DL-982341",
                    license_category="LMV",
                    license_expiry=date.today() + timedelta(days=400),
                    contact_number="+91 98765 43210",
                    safety_score=Decimal("94.5"),
                    status=DriverStatus.available,
                    region="West",
                ),
                Driver(
                    full_name="Suresh Patil",
                    license_number="MH-DL-441208",
                    license_category="HMV",
                    license_expiry=date.today() + timedelta(days=20),
                    contact_number="+91 98220 11884",
                    safety_score=Decimal("88.0"),
                    status=DriverStatus.available,
                    region="North",
                ),
                Driver(
                    full_name="Fatima Khan",
                    license_number="KA-DL-773019",
                    license_category="LMV",
                    license_expiry=date.today() + timedelta(days=600),
                    contact_number="+91 99001 55667",
                    safety_score=Decimal("97.2"),
                    status=DriverStatus.off_duty,
                    region="South",
                ),
                Driver(
                    full_name="Ravi Kumar",
                    license_number="TN-DL-220145",
                    license_category="HMV",
                    license_expiry=date.today() - timedelta(days=5),
                    contact_number="+91 94440 22991",
                    safety_score=Decimal("71.0"),
                    status=DriverStatus.suspended,
                    region="South",
                ),
            ]
        )

    db.commit()
