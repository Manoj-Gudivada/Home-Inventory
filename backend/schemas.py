"""Pydantic request/response schemas."""
from datetime import datetime

from pydantic import BaseModel, Field


# ── Auth ──────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=6, max_length=100)


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    username: str

    model_config = {"from_attributes": True}


# ── Product Catalog ───────────────────────────────────────────

class ProductCreate(BaseModel):
    barcode: str = Field(..., min_length=1, max_length=64)
    name: str = Field(..., min_length=1, max_length=255)
    brand: str | None = Field(None, max_length=255)
    category: str | None = Field(None, max_length=100)
    description: str | None = None
    image_url: str | None = Field(None, max_length=500)


class ProductUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    brand: str | None = Field(None, max_length=255)
    category: str | None = Field(None, max_length=100)
    description: str | None = None
    image_url: str | None = Field(None, max_length=500)


class ProductResponse(BaseModel):
    id: int
    barcode: str
    name: str
    brand: str | None = None
    category: str | None = None
    description: str | None = None
    image_url: str | None = None
    created_by: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Inventory ─────────────────────────────────────────────────

class InventoryItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(0, ge=0)
    zone: str = Field("Pantry", min_length=1, max_length=100)
    threshold: int = Field(1, ge=0)
    expiry_date: datetime | None = None
    notes: str | None = None


class InventoryItemUpdate(BaseModel):
    quantity: int | None = Field(None, ge=0)
    zone: str | None = Field(None, min_length=1, max_length=100)
    threshold: int | None = Field(None, ge=0)
    expiry_date: datetime | None = None
    notes: str | None = None


class InventoryItemResponse(BaseModel):
    id: int
    user_id: int
    product_id: int
    quantity: int
    zone: str
    threshold: int
    expiry_date: datetime | None = None
    notes: str | None = None
    product: ProductResponse | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Barcode ───────────────────────────────────────────────────

class BarcodeLookupResponse(BaseModel):
    barcode: str
    product: ProductResponse


class BarcodeNotFoundResponse(BaseModel):
    barcode: str
    message: str = "Product not found in catalog"


# ── Receipt ───────────────────────────────────────────────────

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
