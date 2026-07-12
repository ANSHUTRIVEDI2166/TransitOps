import os
import secrets
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.security import get_current_user, require_roles
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.document import VehicleDocument
from app.models.enums import UserRole
from app.config import settings

router = APIRouter(prefix="/api/vehicles", tags=["documents"])

ALLOWED_EXT = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".doc", ".docx"}
MAX_BYTES = 8 * 1024 * 1024


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vehicle_id: int
    title: str
    original_name: str
    content_type: Optional[str]
    size_bytes: int
    created_at: object


def _upload_root() -> Path:
    root = Path(settings.UPLOAD_DIR)
    root.mkdir(parents=True, exist_ok=True)
    return root


@router.get("/{vehicle_id}/documents", response_model=List[DocumentOut])
def list_documents(
    vehicle_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return (
        db.query(VehicleDocument)
        .filter(VehicleDocument.vehicle_id == vehicle_id)
        .order_by(VehicleDocument.created_at.desc())
        .all()
    )


@router.post("/{vehicle_id}/documents", response_model=DocumentOut, status_code=201)
async def upload_document(
    vehicle_id: int,
    title: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.fleet_manager)),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    original = file.filename or "document"
    ext = Path(original).suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Use: {', '.join(sorted(ALLOWED_EXT))}",
        )

    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 8MB)")

    folder = _upload_root() / str(vehicle_id)
    folder.mkdir(parents=True, exist_ok=True)
    stored = f"{secrets.token_hex(8)}{ext}"
    path = folder / stored
    path.write_bytes(content)

    doc = VehicleDocument(
        vehicle_id=vehicle_id,
        title=title.strip() or original,
        original_name=original,
        stored_name=stored,
        content_type=file.content_type,
        size_bytes=len(content),
        uploaded_by=user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/documents/{doc_id}/download")
def download_document(
    doc_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    doc = db.query(VehicleDocument).filter(VehicleDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    path = _upload_root() / str(doc.vehicle_id) / doc.stored_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="File missing on server")

    return FileResponse(
        path,
        media_type=doc.content_type or "application/octet-stream",
        filename=doc.original_name,
    )


@router.delete("/documents/{doc_id}", status_code=204)
def delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.fleet_manager)),
):
    doc = db.query(VehicleDocument).filter(VehicleDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    path = _upload_root() / str(doc.vehicle_id) / doc.stored_name
    if path.exists():
        os.remove(path)

    db.delete(doc)
    db.commit()
    return None
