import smtplib
from email.message import EmailMessage

from fastapi import HTTPException

from app.config import settings


def send_email(to_email: str, subject: str, body: str) -> None:
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        raise HTTPException(
            status_code=500,
            detail="SMTP is not configured. Set SMTP_USER and SMTP_PASSWORD in backend/.env",
        )

    # Gmail app passwords are often copied with spaces — strip them
    smtp_user = settings.SMTP_USER.strip()
    smtp_password = settings.SMTP_PASSWORD.replace(" ", "").strip()

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.mail_from
    msg["To"] = to_email
    msg.set_content(body)

    try:
        if settings.SMTP_PORT == 465:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as smtp:
                smtp.login(smtp_user, smtp_password)
                smtp.send_message(msg)
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as smtp:
                smtp.ehlo()
                if settings.SMTP_USE_TLS:
                    smtp.starttls()
                    smtp.ehlo()
                smtp.login(smtp_user, smtp_password)
                smtp.send_message(msg)
    except smtplib.SMTPAuthenticationError as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Gmail rejected SMTP login. Create a new App Password at "
                "https://myaccount.google.com/apppasswords (2-Step Verification must be ON), "
                "then update SMTP_PASSWORD in backend/.env and restart the API."
            ),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send email: {exc}",
        ) from exc


def send_credentials_email(to_email: str, full_name: str, password: str, role: str) -> None:
    login_url = f"{settings.FRONTEND_URL.rstrip('/')}/login"
    body = (
        f"Hi {full_name},\n\n"
        f"Your TransitOps account has been created.\n\n"
        f"Email: {to_email}\n"
        f"Temporary password: {password}\n"
        f"Role: {role.replace('_', ' ').title()}\n\n"
        f"Sign in here: {login_url}\n\n"
        f"Please change your password after logging in if needed, "
        f"or use Forgot password on the login page.\n\n"
        f"— TransitOps"
    )
    send_email(to_email, "Your TransitOps login credentials", body)


def send_reset_email(to_email: str, full_name: str, token: str) -> None:
    reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={token}"
    body = (
        f"Hi {full_name},\n\n"
        f"We received a request to reset your TransitOps password.\n\n"
        f"Reset link (valid for 1 hour):\n{reset_url}\n\n"
        f"If you did not request this, you can ignore this email.\n\n"
        f"— TransitOps"
    )
    send_email(to_email, "Reset your TransitOps password", body)
