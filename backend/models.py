"""SQLAlchemy ORM models."""
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from database import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    inventory_items = relationship(
        "InventoryItem",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    products_created = relationship(
        "Product",
        back_populates="created_by_user",
    )

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}')>"


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    barcode = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    brand = Column(String(255), nullable=True)
    category = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    created_by_user = relationship("User", back_populates="products_created")
    inventory_items = relationship("InventoryItem", back_populates="product")

    def __repr__(self):
        return f"<Product(id={self.id}, barcode='{self.barcode}', name='{self.name}')>"


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False, default=0)
    zone = Column(String(100), nullable=False, default="Pantry")
    threshold = Column(Integer, nullable=False, default=1)
    expiry_date = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    user = relationship("User", back_populates="inventory_items")
    product = relationship("Product", back_populates="inventory_items")

    __table_args__ = (
        UniqueConstraint("user_id", "product_id", name="uq_user_product"),
    )

    def __repr__(self):
        return f"<InventoryItem(id={self.id}, user_id={self.user_id}, product_id={self.product_id}, qty={self.quantity})>"
