#!/usr/bin/env python3
"""
Assign a customer to a sales person by email.
Usage: python -m scripts.assign_customer_to_sales <customer_email> <sales_email>
Example: python -m scripts.assign_customer_to_sales laetitia.fauquembergue@gmail.com damien@mahinc.fr
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import SessionLocal
from app.models.user import User


def main():
    if len(sys.argv) < 3:
        print("Usage: python -m scripts.assign_customer_to_sales <customer_email> <sales_email>")
        sys.exit(1)
    customer_email = sys.argv[1].strip().lower()
    sales_email = sys.argv[2].strip().lower()

    db = SessionLocal()
    try:
        customer = db.query(User).filter(
            User.role == "customer",
            User.email.ilike(customer_email),
        ).first()
        sales = db.query(User).filter(
            User.role.in_(["sales", "director", "pmm", "admin"]),
            User.email.ilike(sales_email),
        ).first()

        if not customer:
            print(f"Customer not found: {customer_email}")
            sys.exit(1)
        if not sales:
            print(f"Sales person not found: {sales_email}")
            sys.exit(1)

        if customer.assigned_sales_id == sales.id:
            print(f"{customer.full_name} ({customer.email}) is already assigned to {sales.full_name} ({sales.email}).")
            return

        customer.assigned_sales_id = sales.id
        if not customer.created_by_id:
            customer.created_by_id = sales.id
        db.commit()
        print(f"Assigned {customer.full_name} ({customer.email}) to {sales.full_name} ({sales.email}).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
