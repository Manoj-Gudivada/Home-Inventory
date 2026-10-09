"""Inventory CRUD and bulk-update endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import InventoryItem, BarcodeMapping
from schemas import (
    InventoryItemCreate,
    InventoryItemUpdate,
    InventoryItemResponse,
    BulkUpdateRequest,
    BulkUpdateResponse,
)

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("", response_model=list[InventoryItemResponse])
def list_inventory(db: Session = Depends(get_db)):
    """List all inventory items, ordered by zone then name."""
    items = (
        db.query(InventoryItem)
        .order_by(InventoryItem.zone, InventoryItem.name)
        .all()
    )
    return items


@router.get("/low-stock", response_model=list[InventoryItemResponse])
def list_low_stock(db: Session = Depends(get_db)):
    """List items where quantity <= threshold."""
    items = (
        db.query(InventoryItem)
        .filter(InventoryItem.quantity <= InventoryItem.threshold)
        .order_by(InventoryItem.zone, InventoryItem.name)
        .all()
    )
    return items


@router.post("", response_model=InventoryItemResponse, status_code=201)
def create_item(payload: InventoryItemCreate, db: Session = Depends(get_db)):
    """Create a new inventory item, optionally linked to a barcode."""
    item = InventoryItem(
        name=payload.name,
        quantity=payload.quantity,
        zone=payload.zone,
        threshold=payload.threshold,
    )
    db.add(item)
    db.flush()  # get item.id

    if payload.barcode:
        db.add(BarcodeMapping(barcode=payload.barcode, item_id=item.id))

    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=InventoryItemResponse)
def update_item(item_id: int, payload: InventoryItemUpdate, db: Session = Depends(get_db)):
    """Update an inventory item (partial update)."""
    item = db.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    """Delete an inventory item and its barcode mappings."""
    item = db.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()


@router.post("/bulk-update", response_model=BulkUpdateResponse)
def bulk_update(payload: BulkUpdateRequest, db: Session = Depends(get_db)):
    """Bulk update inventory from verified receipt data.

    For each entry: if an item with the same name (case-insensitive) exists,
    increment its quantity. Otherwise create a new item.
    """
    updated = 0
    created = 0

    for entry in payload.items:
        existing = (
            db.query(InventoryItem)
            .filter(InventoryItem.name.ilike(entry.name))
            .first()
        )
        if existing:
            existing.quantity += entry.quantity
            updated += 1
        else:
            db.add(InventoryItem(
                name=entry.name,
                quantity=entry.quantity,
                zone=entry.zone,
                threshold=entry.threshold,
            ))
            created += 1

    db.commit()
    return BulkUpdateResponse(updated=updated, created=created)
