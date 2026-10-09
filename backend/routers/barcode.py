"""Barcode scanning and lookup endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import InventoryItem, BarcodeMapping
from schemas import (
    BarcodeLookupResponse,
    BarcodeProductResponse,
    BarcodeLinkRequest,
    InventoryItemResponse,
)
from services.openfoodfacts import lookup_product

router = APIRouter(prefix="/barcode", tags=["barcode"])


@router.get("/{barcode}", response_model=BarcodeLookupResponse)
async def lookup_barcode(barcode: str, db: Session = Depends(get_db)):
    """Look up a barcode. Returns linked item if known, else queries Open Food Facts.

    Raises 404 if the barcode is not found locally or in Open Food Facts.
    """
    # 1. Check local mapping
    mapping = db.get(BarcodeMapping, barcode)
    if mapping:
        item = db.get(InventoryItem, mapping.item_id)
        if item:
            return BarcodeLookupResponse(
                barcode=barcode,
                item_id=item.id,
                name=item.name,
                quantity=item.quantity,
                zone=item.zone,
            )

    # 2. Query Open Food Facts
    product = await lookup_product(barcode)
    if product:
        return BarcodeProductResponse(
            barcode=barcode,
            name=product["name"],
            brand=product.get("brand"),
        )

    # 3. Not found
    raise HTTPException(
        status_code=404,
        detail=f"Barcode {barcode} not found in local database or Open Food Facts.",
    )


@router.post("/link", response_model=InventoryItemResponse)
def link_barcode(payload: BarcodeLinkRequest, db: Session = Depends(get_db)):
    """Link a barcode to an existing inventory item."""
    item = db.get(InventoryItem, payload.item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    existing = db.get(BarcodeMapping, payload.barcode)
    if existing:
        raise HTTPException(status_code=409, detail="Barcode already linked to another item")

    db.add(BarcodeMapping(barcode=payload.barcode, item_id=payload.item_id))
    db.commit()
    db.refresh(item)
    return item
