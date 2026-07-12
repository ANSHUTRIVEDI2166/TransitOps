from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, EmailStr, Field, ConfigDict


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    role: str
    is_active: bool = True


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    role: str
    password: Optional[str] = Field(default=None, min_length=8)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class MessageOut(BaseModel):
    message: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class VehicleCreate(BaseModel):
    registration_number: str = Field(min_length=2, max_length=64)
    name: str = Field(min_length=1, max_length=120)
    vehicle_type: str
    max_load_kg: Decimal = Field(gt=0)
    odometer_km: Decimal = Field(ge=0, default=Decimal("0"))
    acquisition_cost: Decimal = Field(ge=0, default=Decimal("0"))
    status: str = "available"
    region: Optional[str] = None


class VehicleUpdate(BaseModel):
    name: Optional[str] = None
    vehicle_type: Optional[str] = None
    max_load_kg: Optional[Decimal] = None
    odometer_km: Optional[Decimal] = None
    acquisition_cost: Optional[Decimal] = None
    status: Optional[str] = None
    region: Optional[str] = None


class VehicleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    registration_number: str
    name: str
    vehicle_type: str
    max_load_kg: Decimal
    odometer_km: Decimal
    acquisition_cost: Decimal
    status: str
    region: Optional[str]
    created_at: datetime


class DriverCreate(BaseModel):
    full_name: str
    license_number: str
    license_category: str
    license_expiry: date
    contact_number: str
    safety_score: Decimal = Field(ge=0, le=100, default=Decimal("100"))
    status: str = "available"
    region: Optional[str] = None


class DriverUpdate(BaseModel):
    full_name: Optional[str] = None
    license_category: Optional[str] = None
    license_expiry: Optional[date] = None
    contact_number: Optional[str] = None
    safety_score: Optional[Decimal] = None
    status: Optional[str] = None
    region: Optional[str] = None


class DriverOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    license_number: str
    license_category: str
    license_expiry: date
    contact_number: str
    safety_score: Decimal
    status: str
    region: Optional[str]
    license_expired: bool = False


class TripCreate(BaseModel):
    source: str
    destination: str
    vehicle_id: int
    driver_id: int
    cargo_weight_kg: Decimal = Field(gt=0)
    planned_distance_km: Decimal = Field(gt=0)
    revenue: Decimal = Field(ge=0, default=Decimal("0"))
    notes: Optional[str] = None


class TripComplete(BaseModel):
    final_odometer_km: Decimal = Field(gt=0)
    fuel_consumed_liters: Decimal = Field(ge=0)
    fuel_cost: Decimal = Field(ge=0, default=Decimal("0"))


class TripOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source: str
    destination: str
    vehicle_id: int
    driver_id: int
    cargo_weight_kg: Decimal
    planned_distance_km: Decimal
    actual_distance_km: Optional[Decimal]
    fuel_consumed_liters: Optional[Decimal]
    final_odometer_km: Optional[Decimal]
    revenue: Decimal
    status: str
    notes: Optional[str]
    created_at: datetime
    dispatched_at: Optional[datetime]
    completed_at: Optional[datetime]
    vehicle_reg: Optional[str] = None
    driver_name: Optional[str] = None


class MaintenanceCreate(BaseModel):
    vehicle_id: int
    title: str
    description: Optional[str] = None
    cost: Decimal = Field(ge=0, default=Decimal("0"))
    service_date: date


class MaintenanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vehicle_id: int
    title: str
    description: Optional[str]
    cost: Decimal
    service_date: date
    status: str
    created_at: datetime
    closed_at: Optional[datetime]
    vehicle_reg: Optional[str] = None


class FuelLogCreate(BaseModel):
    vehicle_id: int
    liters: Decimal = Field(gt=0)
    cost: Decimal = Field(ge=0)
    log_date: date
    odometer_km: Optional[Decimal] = None
    trip_id: Optional[int] = None
    notes: Optional[str] = None


class FuelLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vehicle_id: int
    trip_id: Optional[int]
    liters: Decimal
    cost: Decimal
    log_date: date
    odometer_km: Optional[Decimal]
    notes: Optional[str]
    vehicle_reg: Optional[str] = None


class ExpenseCreate(BaseModel):
    vehicle_id: Optional[int] = None
    category: str
    amount: Decimal = Field(gt=0)
    expense_date: date
    description: Optional[str] = None


class ExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vehicle_id: Optional[int]
    category: str
    amount: Decimal
    expense_date: date
    description: Optional[str]
    vehicle_reg: Optional[str] = None


class DashboardKPI(BaseModel):
    active_vehicles: int
    available_vehicles: int
    vehicles_in_maintenance: int
    active_trips: int
    pending_trips: int
    drivers_on_duty: int
    fleet_utilization_pct: float


class VehicleAnalytics(BaseModel):
    vehicle_id: int
    registration_number: str
    name: str
    fuel_efficiency: Optional[float]
    operational_cost: float
    fuel_cost: float
    maintenance_cost: float
    revenue: float
    roi: Optional[float]
    acquisition_cost: float
    total_distance: float


class AnalyticsSummary(BaseModel):
    fleet_utilization_pct: float
    total_operational_cost: float
    total_fuel_cost: float
    total_maintenance_cost: float
    avg_fuel_efficiency: Optional[float]
    vehicles: List[VehicleAnalytics]
