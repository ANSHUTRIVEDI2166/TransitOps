import csv
import io
from typing import Optional

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.security import get_current_user
from app.models.user import User
from app.schemas import DashboardKPI, AnalyticsSummary
from app.services.analytics import get_dashboard_kpis, get_analytics, get_home_overview
from app.services.pdf_export import build_analytics_pdf

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard", response_model=DashboardKPI)
def dashboard(
    vehicle_type: Optional[str] = None,
    status: Optional[str] = None,
    region: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return get_dashboard_kpis(db, vehicle_type, status, region)


@router.get("/dashboard/overview")
def dashboard_overview(
    vehicle_type: Optional[str] = None,
    status: Optional[str] = None,
    region: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return get_home_overview(db, vehicle_type, status, region)


@router.get("/analytics", response_model=AnalyticsSummary)
def analytics(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return get_analytics(db)


@router.get("/analytics/export.csv")
def export_csv(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    data = get_analytics(db)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "Registration",
            "Name",
            "Fuel Efficiency (km/L)",
            "Fuel Cost",
            "Maintenance Cost",
            "Operational Cost",
            "Revenue",
            "ROI",
            "Acquisition Cost",
            "Total Distance",
        ]
    )
    for row in data.vehicles:
        writer.writerow(
            [
                row.registration_number,
                row.name,
                row.fuel_efficiency or "",
                row.fuel_cost,
                row.maintenance_cost,
                row.operational_cost,
                row.revenue,
                row.roi if row.roi is not None else "",
                row.acquisition_cost,
                row.total_distance,
            ]
        )
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transitops-analytics.csv"},
    )


@router.get("/analytics/export.pdf")
def export_pdf(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    data = get_analytics(db)
    pdf_bytes = build_analytics_pdf(data)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=transitops-analytics.pdf"},
    )
