import enum


class UserRole(str, enum.Enum):
    admin = "admin"
    fleet_manager = "fleet_manager"
    dispatcher = "dispatcher"
    safety_officer = "safety_officer"
    financial_analyst = "financial_analyst"


class VehicleStatus(str, enum.Enum):
    available = "available"
    on_trip = "on_trip"
    in_shop = "in_shop"
    retired = "retired"


class VehicleType(str, enum.Enum):
    van = "van"
    truck = "truck"
    trailer = "trailer"
    bike = "bike"


class DriverStatus(str, enum.Enum):
    available = "available"
    on_trip = "on_trip"
    off_duty = "off_duty"
    suspended = "suspended"


class TripStatus(str, enum.Enum):
    draft = "draft"
    dispatched = "dispatched"
    completed = "completed"
    cancelled = "cancelled"


class MaintenanceStatus(str, enum.Enum):
    open = "open"
    closed = "closed"


class ExpenseCategory(str, enum.Enum):
    fuel = "fuel"
    maintenance = "maintenance"
    toll = "toll"
    other = "other"
