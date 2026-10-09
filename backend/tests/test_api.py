"""Tests for the Home Inventory API."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from database import get_db, Base
from models import User, Product, InventoryItem
from auth import hash_password, create_access_token

# Use in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    """Create tables before each test and drop them after."""
    from database import Base
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_user():
    """Create a test user and return auth headers."""
    db = TestingSessionLocal()
    user = User(username="testuser", password_hash=hash_password("testpass123"))
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    token = create_access_token(user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_user2():
    """Create a second test user."""
    db = TestingSessionLocal()
    user = User(username="testuser2", password_hash=hash_password("testpass456"))
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    token = create_access_token(user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_product(test_user):
    """Create a sample product in the catalog."""
    response = client.post(
        "/products",
        json={"barcode": "1234567890123", "name": "Test Milk", "brand": "TestBrand", "category": "Dairy"},
        headers=test_user,
    )
    return response.json()


# ── Auth Tests ─────────────────────────────────────────────────

def test_register():
    response = client.post("/auth/register", json={"username": "newuser", "password": "newpass123"})
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_register_duplicate_username():
    client.post("/auth/register", json={"username": "dupuser", "password": "pass123"})
    response = client.post("/auth/register", json={"username": "dupuser", "password": "pass123"})
    assert response.status_code == 409


def test_login_success():
    client.post("/auth/register", json={"username": "loginuser", "password": "loginpass123"})
    response = client.post("/auth/login", json={"username": "loginuser", "password": "loginpass123"})
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_wrong_password():
    client.post("/auth/register", json={"username": "loginuser2", "password": "loginpass123"})
    response = client.post("/auth/login", json={"username": "loginuser2", "password": "wrongpass"})
    assert response.status_code == 401


def test_protected_endpoint_without_auth():
    response = client.get("/inventory")
    assert response.status_code == 401


# ── Product Catalog Tests ──────────────────────────────────────

def test_create_product(test_user):
    response = client.post(
        "/products",
        json={"barcode": "1111111111111", "name": "Product A", "brand": "Brand A"},
        headers=test_user,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Product A"
    assert data["barcode"] == "1111111111111"


def test_create_product_duplicate_barcode(test_user, sample_product):
    response = client.post(
        "/products",
        json={"barcode": "1234567890123", "name": "Different Name"},
        headers=test_user,
    )
    assert response.status_code == 409


def test_list_products(test_user, sample_product):
    response = client.get("/products", headers=test_user)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1


def test_product_shared_between_users(test_user, test_user2, sample_product):
    """Product added by one user should be visible to another."""
    response = client.get("/products", headers=test_user2)
    assert response.status_code == 200
    data = response.json()
    assert any(p["barcode"] == "1234567890123" for p in data)


# ── Barcode Tests ──────────────────────────────────────────────

def test_barcode_lookup_found(test_user, sample_product):
    response = client.get("/barcode/1234567890123", headers=test_user)
    assert response.status_code == 200
    data = response.json()
    assert data["product"]["name"] == "Test Milk"


def test_barcode_lookup_not_found(test_user):
    response = client.get("/barcode/9999999999999", headers=test_user)
    assert response.status_code == 200  # Returns 200 with not_found message
    data = response.json()
    assert "message" in data
    assert "not found" in data["message"].lower()


def test_barcode_leading_zeros_preserved(test_user):
    """Leading zeros in barcodes must be preserved."""
    client.post(
        "/products",
        json={"barcode": "0012345678901", "name": "Zero Leading Product"},
        headers=test_user,
    )
    response = client.get("/barcode/0012345678901", headers=test_user)
    assert response.status_code == 200
    assert response.json()["product"]["barcode"] == "0012345678901"


# ── Inventory Tests ────────────────────────────────────────────

def test_add_to_inventory(test_user, sample_product):
    response = client.post(
        "/inventory",
        json={"product_id": sample_product["id"], "quantity": 2, "zone": "Fridge"},
        headers=test_user,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["quantity"] == 2
    assert data["product"]["name"] == "Test Milk"


def test_inventory_private_to_user(test_user, test_user2, sample_product):
    """One user's inventory should not be visible to another."""
    client.post(
        "/inventory",
        json={"product_id": sample_product["id"], "quantity": 5},
        headers=test_user,
    )
    response = client.get("/inventory", headers=test_user2)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 0


def test_inventory_update(test_user, sample_product):
    response = client.post(
        "/inventory",
        json={"product_id": sample_product["id"], "quantity": 1},
        headers=test_user,
    )
    item_id = response.json()["id"]

    response = client.put(
        f"/inventory/{item_id}",
        json={"quantity": 10},
        headers=test_user,
    )
    assert response.status_code == 200
    assert response.json()["quantity"] == 10


def test_inventory_delete(test_user, sample_product):
    response = client.post(
        "/inventory",
        json={"product_id": sample_product["id"], "quantity": 1},
        headers=test_user,
    )
    item_id = response.json()["id"]

    response = client.delete(f"/inventory/{item_id}", headers=test_user)
    assert response.status_code == 204

    response = client.get("/inventory", headers=test_user)
    assert len(response.json()) == 0


def test_duplicate_inventory_item(test_user, sample_product):
    """Adding the same product twice should return 409."""
    client.post(
        "/inventory",
        json={"product_id": sample_product["id"], "quantity": 1},
        headers=test_user,
    )
    response = client.post(
        "/inventory",
        json={"product_id": sample_product["id"], "quantity": 1},
        headers=test_user,
    )
    assert response.status_code == 409


def test_low_stock(test_user, sample_product):
    client.post(
        "/inventory",
        json={"product_id": sample_product["id"], "quantity": 1, "threshold": 5},
        headers=test_user,
    )
    response = client.get("/inventory/low-stock", headers=test_user)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1


# ── Bulk Update Tests ──────────────────────────────────────────

def test_bulk_update_creates_products(test_user):
    response = client.post(
        "/inventory/bulk-update",
        json={"items": [{"name": "New Item", "quantity": 3, "zone": "Pantry"}]},
        headers=test_user,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["created"] == 2  # 1 product + 1 inventory item


def test_bulk_update_increments_existing(test_user, sample_product):
    """Bulk update with existing product name should increment quantity."""
    client.post(
        "/inventory",
        json={"product_id": sample_product["id"], "quantity": 2},
        headers=test_user,
    )
    response = client.post(
        "/inventory/bulk-update",
        json={"items": [{"name": "Test Milk", "quantity": 3}]},
        headers=test_user,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["updated"] == 1


# ── Health Check ───────────────────────────────────────────────

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
