"""SQLAlchemy ORM models."""
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from database import Base


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=False, default=0)
    zone = Column(String(100), nullable=False, default="Pantry")
    threshold = Column(Integer, nullable=False, default=1)

    barcode_mappings = relationship(
        "BarcodeMapping",
        back_populates="item",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<InventoryItem(id={self.id}, name='{self.name}', qty={self.quantity}, zone='{self.zone}')>"


class BarcodeMapping(Base):
    __tablename__ = "barcode_mappings"

    barcode = Column(String(64), primary_key=True)
    item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=False)

    item = relationship("InventoryItem", back_populates="barcode_mappings")

    def __repr__(self):
        return f"<BarcodeMapping(barcode='{self.barcode}', item_id={self.item_id})>"
