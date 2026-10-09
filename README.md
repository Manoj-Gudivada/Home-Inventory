# Home Inventory

Full-stack home inventory management web application — track groceries, scan barcodes, and extract items from receipts.

## Tech Stack

| Layer     | Technology |
|-----------|-----------|
| Frontend  | React 18, Vite, Tailwind CSS, html5-qrcode |
| Backend   | FastAPI, Pydantic, SQLAlchemy 2.0 |
| Database  | MySQL 8+ (PyMySQL driver) |
| AI        | Google Gemini Vision (receipt parsing) |

## Project Structure

```
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── database.py          # SQLAlchemy engine/session
│   ├── models.py            # ORM models (InventoryItem, BarcodeMapping)
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── routers/
│   │   ├── inventory.py     # CRUD + bulk-update endpoints
│   │   ├── barcode.py       # Barcode lookup (local + Open Food Facts)
│   │   └── receipt.py       # Receipt image upload + Gemini extraction
│   ├── services/
│   │   ├── openfoodfacts.py # Open Food Facts API client
│   │   └── llm_vision.py    # Gemini Vision API client
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main app with tab navigation
│   │   ├── api.js           # API client functions
│   │   └── components/
│   │       ├── InventoryList.jsx   # Zone-grouped item list
│   │       ├── ItemCard.jsx        # Item with +/- quantity buttons
│   │       ├── ShoppingList.jsx    # Low-stock items view
│   │       ├── BarcodeScanner.jsx  # Camera barcode scanning
│   │       ├── ReceiptUpload.jsx   # Camera receipt capture
│   │       ├── ReceiptReview.jsx   # Editable draft review
│   │       └── AddItemModal.jsx    # Manual item entry
│   ├── package.json
│   └── vite.config.js
```

## Setup

### 1. Database

```sql
CREATE DATABASE home_inventory CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'inventory'@'localhost' IDENTIFIED BY 'inventory';
GRANT ALL PRIVILEGES ON home_inventory.* TO 'inventory'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Edit `.env` and set your Gemini API key (get one at https://aistudio.google.com/apikey).

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### 4. Mobile Access

To use on a phone on the same network:

```bash
# Find your machine's LAN IP
hostname -I

# Start frontend bound to all interfaces (already configured in vite.config.js)
npm run dev
```

Then open `http://<your-lan-ip>:5173` on your phone.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/inventory` | List all items |
| GET | `/inventory/low-stock` | Items at/below threshold |
| POST | `/inventory` | Create item (optional barcode link) |
| PUT | `/inventory/{id}` | Update item |
| DELETE | `/inventory/{id}` | Delete item |
| POST | `/inventory/bulk-update` | Bulk update from receipt |
| GET | `/barcode/{barcode}` | Lookup barcode (local → Open Food Facts) |
| POST | `/barcode/link` | Link barcode to existing item |
| POST | `/receipt/extract` | Upload receipt image → Gemini → JSON items |

## Features

- **Quick Audit**: Zone-grouped inventory with large touch-friendly +/− buttons
- **Shopping List**: Automatic low-stock detection (quantity ≤ threshold)
- **Barcode Scanning**: Camera scan → local DB → Open Food Facts → manual entry fallback
- **Receipt Extraction**: Photo → Gemini Vision → editable review → bulk save
- **Self-Learning**: Scanned barcodes are saved locally for instant future lookups
