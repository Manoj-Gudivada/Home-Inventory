"""Multimodal LLM Vision API client for receipt parsing (Google Gemini)."""
import base64
import json
import os

from google import genai
from google.genai import types

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

SYSTEM_PROMPT = """You are a receipt parsing assistant. Analyze the provided receipt image and extract all grocery items.

For each item, provide:
- inferred_name: A clean, normalized item name (e.g., "Organic Whole Milk 1L")
- raw_text: The exact text as it appears on the receipt
- quantity: The quantity purchased (integer, default 1 if not specified)

Rules:
- Extract ONLY grocery/food items. Ignore store name, address, phone numbers, dates, payment info, totals, taxes, and non-grocery items.
- Return ONLY valid JSON in this exact format:
{
  "items": [
    {"inferred_name": "...", "raw_text": "...", "quantity": 1}
  ]
}
- Do not include any text before or after the JSON.
- If no grocery items are found, return {"items": []}"""


async def extract_receipt_items(image_bytes: bytes, mime_type: str = "image/jpeg") -> list[dict]:
    """Send a receipt image to Gemini and return extracted items."""
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your-gemini-api-key-here":
        raise RuntimeError(
            "GEMINI_API_KEY is not configured. Set it in your .env file."
        )

    client = genai.Client(api_key=GEMINI_API_KEY)

    b64_image = base64.b64encode(image_bytes).decode("utf-8")

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=[
            types.Content(
                role="user",
                parts=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    types.Part.from_text(text=SYSTEM_PROMPT),
                ],
            )
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema={
                "type": "object",
                "properties": {
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "inferred_name": {"type": "string"},
                                "raw_text": {"type": "string"},
                                "quantity": {"type": "integer"},
                            },
                            "required": ["inferred_name", "raw_text", "quantity"],
                        },
                    }
                },
                "required": ["items"],
            },
        ),
    )

    result = json.loads(response.text)
    items = result.get("items", [])

    # Validate and clean
    cleaned = []
    for item in items:
        name = item.get("inferred_name", "").strip()
        if not name:
            continue
        cleaned.append({
            "inferred_name": name,
            "raw_text": item.get("raw_text", ""),
            "quantity": max(1, int(item.get("quantity", 1))),
        })
    return cleaned
