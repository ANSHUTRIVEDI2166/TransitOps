from io import BytesIO
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

from app.schemas import AnalyticsSummary


def build_analytics_pdf(data: AnalyticsSummary) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=0.6 * inch, rightMargin=0.6 * inch)
    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "TitleCustom",
        parent=styles["Heading1"],
        fontSize=18,
        textColor=colors.HexColor("#0b1520"),
        spaceAfter=6,
    )
    subtitle = ParagraphStyle(
        "SubCustom",
        parent=styles["Normal"],
        textColor=colors.HexColor("#5b6b7c"),
        spaceAfter=16,
    )

    story = [
        Paragraph("TransitOps Analytics Report", title),
        Paragraph(
            f"Generated {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
            subtitle,
        ),
        Paragraph(
            f"Fleet utilization: {data.fleet_utilization_pct}% &nbsp;&nbsp; "
            f"Ops cost: {data.total_operational_cost:,.0f} &nbsp;&nbsp; "
            f"Fuel: {data.total_fuel_cost:,.0f} &nbsp;&nbsp; "
            f"Maintenance: {data.total_maintenance_cost:,.0f} &nbsp;&nbsp; "
            f"Avg efficiency: {data.avg_fuel_efficiency or '—'} km/L",
            styles["Normal"],
        ),
        Spacer(1, 14),
    ]

    table_data = [
        [
            "Reg",
            "Name",
            "Eff.",
            "Fuel",
            "Maint.",
            "Ops",
            "Revenue",
            "ROI",
        ]
    ]
    for row in data.vehicles:
        table_data.append(
            [
                row.registration_number,
                row.name[:18],
                f"{row.fuel_efficiency}" if row.fuel_efficiency is not None else "—",
                f"{row.fuel_cost:,.0f}",
                f"{row.maintenance_cost:,.0f}",
                f"{row.operational_cost:,.0f}",
                f"{row.revenue:,.0f}",
                f"{row.roi * 100:.1f}%" if row.roi is not None else "—",
            ]
        )

    table = Table(table_data, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0b1520")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d7dee8")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f3f6f9")]),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(table)
    doc.build(story)
    return buffer.getvalue()
