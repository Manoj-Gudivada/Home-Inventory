# Project Overview
Build a full-stack home inventory management web application optimized for mobile use. The goal is to help users track groceries, scan barcodes, and extract items from receipts, replacing manual paper lists.

# Tech Stack
* **Frontend:** React (functional components, React Hooks, mobile-first responsive layout with Tailwind CSS)
* **Backend:** FastAPI (Python, Pydantic for request/response schemas)
* **Database:** MySQL (using SQLAlchemy ORM and PyMySQL driver for database connections)
* **Key Libraries:** `html5-qrcode` (React barcode camera scanning), `httpx` or `requests` (Python API client), Multimodal LLM Vision API (e.g., `google-generativeai` / Gemini API) for receipt parsing.

# Database Schema Requirements
1. **InventoryItem:** `id` (PK, auto-increment), `name` (string), `quantity` (int), `zone` (string, e.g., Pantry, Fridge, Bathroom), `threshold` (int, minimum amount before restocking).
2. **BarcodeMapping:** `barcode` (PK, string), `item_id` (FK to InventoryItem).

# Core Features & Logic

## 1. Quick Audit & Manual Entry (Mobile-First)
* **UI:** A single-page list view grouped by `zone`. Each item features large, touch-friendly "+" and "-" buttons to adjust quantities quickly with one hand.
* **Shopping List View:** A dedicated view displaying items where `quantity` <= `threshold`.
* **Backend:** RESTful CRUD endpoints (`GET /inventory`, `POST /inventory`, `PUT /inventory/{id}`, `DELETE /inventory/{id}`).

## 2. Barcode Scanning (Self-Learning System)
* **UI:** Integrate mobile camera scanning using `html5-qrcode`.
* **Flow:**
  1. React sends scanned barcode string to `GET /barcode/{barcode}`.
  2. FastAPI checks the local MySQL `BarcodeMapping` table. If found, return the linked item to increment quantity.
  3. If not found locally, FastAPI queries the Open Food Facts API (`https://world.openfoodfacts.org/api/v2/product/{barcode}`). If found, return the product name.
  4. If not found in Open Food Facts, FastAPI returns a 404 status.
  5. React prompts the user: "New Item! Enter item name."
  6. User inputs the name, and React sends a `POST` request to create the item in `InventoryItem` and link it in `BarcodeMapping` for future instant lookups.

## 3. Receipt Extraction (Human-in-the-Loop)
* **UI:** Native camera image capture upload (`<input type="file" accept="image/*" capture="environment">`).
* **Backend Draft Parsing:** An endpoint (`POST /receipt/extract`) that sends the receipt image to a Multimodal LLM Vision API with the prompt to extract grocery items and quantities into a strict JSON list (`inferred_name`, `raw_text`, `quantity`).
* **Review UI:** Display the draft JSON in an editable form before saving to MySQL.
* **Review Features:** Users can edit `inferred_name`, delete rows (e.g., non-grocery items or store metadata), and click "Add Item" to insert blank rows for missing items.
* **Final Save:** A "Save to Inventory" button that sends the final user-verified array to `POST /inventory/bulk-update` to update MySQL quantities in bulk.
