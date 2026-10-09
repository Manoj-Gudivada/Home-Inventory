"""Receipt extraction endpoints."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from database import get_db
from schemas import ReceiptExtractResponse
from services.llm_vision import extract_receipt_items

router = APIRouter(prefix="/receipt", tags=["receipt"])

MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}


@router.post("/extract", response_model=ReceiptExtractResponse)
async def extract_receipt(file: UploadFile = File(...)):
    """Upload a receipt image and extract grocery items using Gemini Vision."""
    # Validate content type
    content_type = file.content_type or ""
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type: {content_type}. Allowed: {', '.join(ALLOWED_TYPES)}",
        )

    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=413, detail="Image too large (max 10 MB)")

    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        items = await extract_receipt_items(contents, mime_type=content_type)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse receipt: {e}")

    return ReceiptExtractResponse(items=items)
