"""Pydantic request/response schemas."""
from pydantic import BaseModel, Field


# ── InventoryItem ──────────────────────────────────────────────

class InventoryItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    quantity: int = Field(0, ge=0)
    zone: str = Field("Pantry", min_length=1, max_length=100)
    threshold: int = Field(1, ge=0)


class InventoryItemCreate(InventoryItemBase):
    barcode: str | None = None


class InventoryItemUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    quantity: int | None = Field(None, ge=0)
    zone: str | None = Field(None, min_length=1, max_length=100)
    threshold: int | None = Field(None, ge=0)


class InventoryItemResponse(InventoryItemBase):
    id: int

    model_config = {"from_attributes": True}


# ── Barcode ────────────────────────────────────────────────────

class BarcodeLookupResponse(BaseModel):
    barcode: str
    item_id: int
    name: str
    quantity: int
    zone: str


class BarcodeProductResponse(BaseModel):
    barcode: str
    name: str
    brand: str | None = None


class BarcodeLinkRequest(BaseModel):
    barcode: str
    item_id: int


# ── Receipt ────────────────────────────────────────────────────

class ReceiptItemDraft(BaseModel):
    inferred_name: str
    raw_text: str = ""
    quantity: int = 1


class ReceiptExtractResponse(BaseModel):
    items: list[ReceiptItemDraft]


class BulkUpdateEntry(BaseModel):
    name: str
    quantity: int = Field(..., ge=0)
    zone: str = "Pantry"
    threshold: int = 1


class BulkUpdateRequest(BaseModel):
    items: list[BulkUpdateEntry]


class BulkUpdateResponse(BaseModel):
    updated: int
    created: int
