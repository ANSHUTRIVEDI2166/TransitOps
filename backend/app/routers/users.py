import secrets
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.enums import UserRole
from app.auth.security import hash_password, require_admin
from app.schemas import UserCreate, UserUpdate, UserOut, MessageOut
from app.services.email import send_credentials_email

router = APIRouter(prefix="/api/users", tags=["users"])

ASSIGNABLE_ROLES = {
    UserRole.fleet_manager,
    UserRole.dispatcher,
    UserRole.safety_officer,
    UserRole.financial_analyst,
    UserRole.admin,
}


def _user_out(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role.value,
        "is_active": user.is_active,
    }


@router.get("", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [_user_out(u) for u in users]


@router.post("", response_model=UserOut, status_code=201)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    try:
        role = UserRole(payload.role)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role")

    if role not in ASSIGNABLE_ROLES:
        raise HTTPException(status_code=400, detail="Role cannot be assigned")

    exists = db.query(User).filter(User.email == payload.email.lower()).first()
    if exists:
        raise HTTPException(status_code=400, detail="Email already registered")

    temp_password = payload.password or secrets.token_urlsafe(10)
    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name.strip(),
        hashed_password=hash_password(temp_password),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.flush()

    try:
        send_credentials_email(user.email, user.full_name, temp_password, user.role.value)
    except Exception:
        db.rollback()
        raise

    db.commit()
    db.refresh(user)
    return _user_out(user)


@router.post("/{user_id}/resend-credentials", response_model=MessageOut)
def resend_credentials(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    temp_password = secrets.token_urlsafe(10)
    user.hashed_password = hash_password(temp_password)
    db.commit()
    send_credentials_email(user.email, user.full_name, temp_password, user.role.value)
    return MessageOut(message=f"New credentials emailed to {user.email}")


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    data = payload.model_dump(exclude_unset=True)
    if "role" in data:
        try:
            role = UserRole(data["role"])
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid role")
        if role not in ASSIGNABLE_ROLES:
            raise HTTPException(status_code=400, detail="Role cannot be assigned")
        data["role"] = role

    if user.id == admin.id and data.get("is_active") is False:
        raise HTTPException(status_code=400, detail="You cannot deactivate yourself")

    for key, value in data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return _user_out(user)


@router.delete("/{user_id}", response_model=MessageOut)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot deactivate yourself")

    user.is_active = False
    db.commit()
    return MessageOut(message="User deactivated")
