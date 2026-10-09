"""One-time migration script: creates new tables and migrates existing data.

Run this once after deploying the new models:
    python migrate.py

This script:
1. Creates the `users` and `products` tables
2. Adds user_id, product_id columns to inventory_items
3. Migrates existing inventory items to the new schema
4. Drops the old barcode_mappings table
"""
import os
import sys

from sqlalchemy import text

# Add parent directory to path so we can import from the backend package
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal  # noqa: E402
from models import User, Product, InventoryItem  # noqa: E402


def migrate():
    """Run the migration."""
    db = SessionLocal()
    try:
        # Check if migration is already applied
        result = db.execute(text("SHOW TABLES LIKE 'users'"))
        if result.fetchone():
            print("Migration already applied. Skipping.")
            return

        print("Starting migration...")

        # 1. Create users table
        print("  Creating users table...")
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_username (username)
            )
        """))

        # 2. Create products table
        print("  Creating products table...")
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                barcode VARCHAR(64) NOT NULL UNIQUE,
                name VARCHAR(255) NOT NULL,
                brand VARCHAR(255) NULL,
                category VARCHAR(100) NULL,
                description TEXT NULL,
                image_url VARCHAR(500) NULL,
                created_by INT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_barcode (barcode),
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        """))

        # 3. Add new columns to inventory_items
        print("  Adding columns to inventory_items...")
        db.execute(text("""
            ALTER TABLE inventory_items
            ADD COLUMN user_id INT NULL,
            ADD COLUMN product_id INT NULL,
            ADD COLUMN expiry_date DATETIME NULL,
            ADD COLUMN notes TEXT NULL,
            ADD COLUMN created_at DATETIME NULL,
            ADD COLUMN updated_at DATETIME NULL
        """))

        # 4. Create a default user for existing data
        print("  Creating default user...")
        db.execute(text("""
            INSERT INTO users (username, password_hash, created_at)
            VALUES ('default', 'migrated', NOW())
        """))
        default_user_id = db.execute(text("SELECT id FROM users WHERE username = 'default'")).fetchone()[0]

        # 5. Migrate existing inventory items
        print("  Migrating inventory items...")
        items = db.execute(text("SELECT id, name, quantity, zone, threshold FROM inventory_items")).fetchall()
        for item in items:
            # Create a product for each existing item
            db.execute(text("""
                INSERT INTO products (barcode, name, created_by, created_at, updated_at)
                VALUES (:barcode, :name, :created_by, NOW(), NOW())
            """), {
                "barcode": f"LEGACY-{item[0]}",
                "name": item[1],
                "created_by": default_user_id,
            })
            product_id = db.execute(text("SELECT LAST_INSERT_ID()")).fetchone()[0]

            # Update the inventory item
            db.execute(text("""
                UPDATE inventory_items
                SET user_id = :user_id, product_id = :product_id,
                    created_at = NOW(), updated_at = NOW()
                WHERE id = :id
            """), {
                "user_id": default_user_id,
                "product_id": product_id,
                "id": item[0],
            })

        # 6. Make new columns NOT NULL
        print("  Setting NOT NULL constraints...")
        db.execute(text("""
            ALTER TABLE inventory_items
            MODIFY COLUMN user_id INT NOT NULL,
            MODIFY COLUMN product_id INT NOT NULL,
            MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        """))

        # 7. Add foreign keys
        print("  Adding foreign keys...")
        db.execute(text("""
            ALTER TABLE inventory_items
            ADD CONSTRAINT fk_inventory_user FOREIGN KEY (user_id) REFERENCES users(id),
            ADD CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES products(id)
        """))

        # 8. Add unique constraint
        db.execute(text("""
            ALTER TABLE inventory_items
            ADD CONSTRAINT uq_user_product UNIQUE (user_id, product_id)
        """))

        # 9. Drop old barcode_mappings table
        print("  Dropping barcode_mappings table...")
        db.execute(text("DROP TABLE IF EXISTS barcode_mappings"))

        # 10. Drop old columns from inventory_items
        print("  Dropping old columns...")
        db.execute(text("ALTER TABLE inventory_items DROP COLUMN name"))
        db.execute(text("ALTER TABLE inventory_items DROP COLUMN zone"))
        db.execute(text("ALTER TABLE inventory_items DROP COLUMN threshold"))

        db.commit()
        print("Migration completed successfully!")
        print(f"  - Created {len(items)} products from existing inventory items")
        print(f"  - Migrated {len(items)} inventory items to new schema")
        print(f"  - Default user ID: {default_user_id}")

    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
