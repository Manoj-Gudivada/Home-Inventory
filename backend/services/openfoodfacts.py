"""Open Food Facts API client."""
import httpx

OFF_API_BASE = "https://world.openfoodfacts.org/api/v2/product"


async def lookup_product(barcode: str) -> dict | None:
    """Look up a product by barcode in Open Food Facts.

    Returns a dict with 'name' and 'brand' if found, else None.
    """
    url = f"{OFF_API_BASE}/{barcode}.json"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                url,
                headers={"User-Agent": "HomeInventoryApp/1.0"},
            )
        if resp.status_code != 200:
            return None
        data = resp.json()
        if data.get("status") != 1 or not data.get("product"):
            return None
        product = data["product"]
        name = product.get("product_name") or product.get("product_name_en")
        if not name:
            return None
        return {
            "name": name,
            "brand": product.get("brands"),
        }
    except Exception:
        return None
