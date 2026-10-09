"""Barcode scanning and lookup endpoints — database-first, no external APIs."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Product, User
from schemas import BarcodeLookupResponse, BarcodeNotFoundResponse

router = APIRouter(prefix="/barcode", tags=["barcode"])


@router.get("/{barcode}")
def lookup_barcode(
    barcode: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Look up a barcode in the local product catalog.

    Returns the product if found, or a 404-style response if not.
    No external API calls are made.
    """
    product = db.query(Product).filter(Product.barcode == barcode).first()
    if product:
        return BarcodeLookupResponse(barcode=barcode, product=product)

    return BarcodeNotFoundResponse(
        barcode=barcode,
        message=f"Barcode '{barcode}' not found in catalog. You can add it as a new product.",
    )
