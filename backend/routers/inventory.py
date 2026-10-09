"""Inventory CRUD and bulk-update endpoints — multi-user."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from auth import get_current_user
from database import get_db
from models import InventoryItem, Product, User
from schemas import (
    BulkUpdateRequest,
    BulkUpdateResponse,
    InventoryItemCreate,
    InventoryItemResponse,
    InventoryItemUpdate,
)

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("", response_model=list[InventoryItemResponse])
def list_inventory(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all inventory items for the current user."""
    items = (
        db.query(InventoryItem)
        .options(joinedload(InventoryItem.product))
        .filter(InventoryItem.user_id == current_user.id)
        .order_by(InventoryItem.zone, InventoryItem.product_id)
        .all()
    )
    return items


@router.get("/low-stock", response_model=list[InventoryItemResponse])
def list_low_stock(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List items where quantity <= threshold for the current user."""
    items = (
        db.query(InventoryItem)
        .options(joinedload(InventoryItem.product))
        .filter(
            InventoryItem.user_id == current_user.id,
            InventoryItem.quantity <= InventoryItem.threshold,
        )
        .order_by(InventoryItem.zone, InventoryItem.product_id)
        .all()
    )
    return items


@router.post("", response_model=InventoryItemResponse, status_code=201)
def create_item(
    payload: InventoryItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a product to the current user's inventory."""
    product = db.get(Product, payload.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Check if user already has this product
    existing = (
        db.query(InventoryItem)
        .filter(
            InventoryItem.user_id == current_user.id,
            InventoryItem.product_id == payload.product_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Product already in your inventory. Use PUT to update quantity.",
        )

    item = InventoryItem(
        user_id=current_user.id,
        product_id=payload.product_id,
        quantity=payload.quantity,
        zone=payload.zone,
        threshold=payload.threshold,
        expiry_date=payload.expiry_date,
        notes=payload.notes,
    )
    db.add(item)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Failed to create inventory item")
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=InventoryItemResponse)
def update_item(
    item_id: int,
    payload: InventoryItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an inventory item (only for the owning user)."""
    item = db.get(InventoryItem, item_id)
    if not item or item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Item not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an inventory item (only for the owning user)."""
    item = db.get(InventoryItem, item_id)
    if not item or item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()


@router.post("/bulk-update", response_model=BulkUpdateResponse)
def bulk_update(
    payload: BulkUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bulk update inventory from verified receipt data.

    For each entry: if a product with the same name exists in the catalog,
    add/increment it in the user's inventory. Otherwise create a new product
    and add it to the user's inventory.
    """
    updated = 0
    created = 0

    for entry in payload.items:
        # Find or create product in shared catalog
        product = (
            db.query(Product)
            .filter(Product.name.ilike(entry.name))
            .first()
        )
        if not product:
            product = Product(
                name=entry.name,
                barcode="",  # No barcode for receipt items
                created_by=current_user.id,
            )
            db.add(product)
            db.flush()
            created += 1

        # Check if user already has this product
        existing = (
            db.query(InventoryItem)
            .filter(
                InventoryItem.user_id == current_user.id,
                InventoryItem.product_id == product.id,
            )
            .first()
        )
        if existing:
            existing.quantity += entry.quantity
            updated += 1
        else:
            db.add(InventoryItem(
                user_id=current_user.id,
                product_id=product.id,
                quantity=entry.quantity,
                zone=entry.zone,
                threshold=entry.threshold,
            ))
            created += 1

    db.commit()
    return BulkUpdateResponse(updated=updated, created=created)
