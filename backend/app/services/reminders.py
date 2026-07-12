from datetime import date, timedelta
from typing import List

from sqlalchemy.orm import Session

from app.models.driver import Driver
from app.models.user import User
from app.models.enums import UserRole
from app.services.email import send_email


def drivers_expiring_within(db: Session, days: int = 30) -> List[Driver]:
    today = date.today()
    limit = today + timedelta(days=days)
    return (
        db.query(Driver)
        .filter(Driver.license_expiry >= today, Driver.license_expiry <= limit)
        .order_by(Driver.license_expiry.asc())
        .all()
    )


def send_license_expiry_reminders(db: Session, days: int = 30) -> dict:
    drivers = drivers_expiring_within(db, days)
    if not drivers:
        return {"sent": 0, "drivers": 0, "message": "No licenses expiring soon."}

    recipients = (
        db.query(User)
        .filter(
            User.is_active.is_(True),
            User.role.in_([UserRole.admin, UserRole.safety_officer]),
        )
        .all()
    )
    if not recipients:
        return {"sent": 0, "drivers": len(drivers), "message": "No admin/safety recipients."}

    lines = []
    for d in drivers:
        days_left = (d.license_expiry - date.today()).days
        lines.append(
            f"- {d.full_name} ({d.license_number}) expires {d.license_expiry} "
            f"({days_left} day(s) left) · status {d.status.value}"
        )

    body = (
        "TransitOps license expiry reminder\n\n"
        f"The following drivers have licenses expiring within {days} days:\n\n"
        + "\n".join(lines)
        + "\n\nPlease renew or suspend as needed.\n\n— TransitOps"
    )

    sent = 0
    for user in recipients:
        send_email(user.email, "TransitOps: driver licenses expiring soon", body)
        sent += 1

    return {
        "sent": sent,
        "drivers": len(drivers),
        "message": f"Reminders emailed to {sent} recipient(s) for {len(drivers)} driver(s).",
    }
