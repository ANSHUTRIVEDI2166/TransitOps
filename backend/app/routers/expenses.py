from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.security import get_current_user, require_roles
from app.models.user import User
from app.models.fuel import FuelLog
from app.models.expense import Expense
from app.models.vehicle import Vehicle
from app.models.enums import UserRole, ExpenseCategory
from app.schemas import (
    FuelLogCreate,
    FuelLogOut,
    ExpenseCreate,
    ExpenseOut,
)

router = APIRouter(tags=["expenses"])


def _fuel_out(db: Session, log: FuelLog) -> dict:
    vehicle = db.query(Vehicle).filter(Vehicle.id == log.vehicle_id).first()
    return {
        "id": log.id,
        "vehicle_id": log.vehicle_id,
        "trip_id": log.trip_id,
        "liters": log.liters,
        "cost": log.cost,
        "log_date": log.log_date,
        "odometer_km": log.odometer_km,
        "notes": log.notes,
        "vehicle_reg": vehicle.registration_number if vehicle else None,
    }


def _expense_out(db: Session, expense: Expense) -> dict:
    vehicle = None
    if expense.vehicle_id:
        vehicle = db.query(Vehicle).filter(Vehicle.id == expense.vehicle_id).first()
    return {
        "id": expense.id,
        "vehicle_id": expense.vehicle_id,
        "category": expense.category.value,
        "amount": expense.amount,
        "expense_date": expense.expense_date,
        "description": expense.description,
        "vehicle_reg": vehicle.registration_number if vehicle else None,
    }


@router.get("/api/fuel", response_model=List[FuelLogOut])
def list_fuel(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    logs = db.query(FuelLog).order_by(FuelLog.log_date.desc()).all()
    return [_fuel_out(db, log) for log in logs]


@router.post("/api/fuel", response_model=FuelLogOut, status_code=201)
def create_fuel(
    payload: FuelLogCreate,
    db: Session = Depends(get_db),
    _: User = Depends(
        require_roles(
            UserRole.fleet_manager,
            UserRole.dispatcher,
            UserRole.financial_analyst,
        )
    ),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == payload.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    log = FuelLog(
        vehicle_id=payload.vehicle_id,
        trip_id=payload.trip_id,
        liters=payload.liters,
        cost=payload.cost,
        log_date=payload.log_date,
        odometer_km=payload.odometer_km,
        notes=payload.notes,
    )
    db.add(log)
    db.add(
        Expense(
            vehicle_id=payload.vehicle_id,
            category=ExpenseCategory.fuel,
            amount=payload.cost,
            expense_date=payload.log_date,
            description=payload.notes or "Fuel refill",
        )
    )
    db.commit()
    db.refresh(log)
    return _fuel_out(db, log)


@router.get("/api/expenses", response_model=List[ExpenseOut])
def list_expenses(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    expenses = db.query(Expense).order_by(Expense.expense_date.desc()).all()
    return [_expense_out(db, e) for e in expenses]


@router.post("/api/expenses", response_model=ExpenseOut, status_code=201)
def create_expense(
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    _: User = Depends(
        require_roles(UserRole.fleet_manager, UserRole.financial_analyst)
    ),
):
    try:
        category = ExpenseCategory(payload.category)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid expense category")

    expense = Expense(
        vehicle_id=payload.vehicle_id,
        category=category,
        amount=payload.amount,
        expense_date=payload.expense_date,
        description=payload.description,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return _expense_out(db, expense)
