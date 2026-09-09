"""
Demo Data Generator for Finance Tracker.

Generates realistic, completely synthetic personal finance transaction records
for product demonstrations, UI screenshots, and first-run evaluation.
Contains zero real personal data or external account information.
"""

import random
from datetime import datetime, timedelta
from typing import Optional
from db.database import get_db_connection
from db.categories import get_categories, create_category

DEMO_EXPENSE_TEMPLATES = [
    ("Food & Drinks", ["Coffee & pastry", "Team lunch", "Dinner with friends", "Takeout dinner", "Smoothie & snack", "Cafe brunch"]),
    ("Groceries", ["Supermarket essentials", "Fresh vegetables and fruit", "Bakery items and milk", "Pantry staples", "Weekly grocery run"]),
    ("Shopping", ["Casual clothing", "Home office supplies", "Kitchenware", "Electronics accessory", "Books & stationery"]),
    ("Transport", ["Metro card recharge", "Bus pass", "Fuel refill", "Ride share to station", "Train ticket"]),
    ("Entertainment", ["Movie tickets", "Weekend outing", "Museum admission", "Gaming subscription", "Concert pass"]),
    ("Utilities", ["Electricity bill", "High-speed internet", "Mobile recharge", "Water utility", "Streaming service"]),
    ("Health & Fitness", ["Pharmacy medicine", "Gym membership", "Dental checkup", "Health supplement"]),
    ("Home", ["Home maintenance repair", "Furniture item", "Hardware tools", "Cleaning supplies", "Home decor"]),
    ("Savings", ["Monthly emergency fund transfer", "High-yield savings deposit", "Recurring savings allocation"]),
    ("Investments", ["Mutual fund SIP investment", "Stock portfolio purchase", "Index fund deposit", "Retirement fund allocation"])
]

DEMO_INCOME_TEMPLATES = [
    ("Salary", ["Monthly salary deposit", "Primary employment compensation"]),
    ("Freelance", ["Web app consulting", "Design project milestone", "Code review engagement"]),
    ("Funds", ["Opening balance fund deposit", "Quarterly dividend payout", "Liquid capital addition", "Cash transfer to funds"])
]

def load_demo_data(num_months: int = 4, transactions_per_month: int = 35) -> int:
    """
    Seeds realistic synthetic transactions into the database.
    Returns the total number of transactions created.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Ensure categories exist
    existing_cats = get_categories()
    cat_map = {(c[1], c[2]): c[0] for c in existing_cats}
    
    for cat_name, _ in DEMO_EXPENSE_TEMPLATES:
        if (cat_name, "expense") not in cat_map:
            create_category(cat_name, "expense", "#4F46E5")
    for cat_name, _ in DEMO_INCOME_TEMPLATES:
        if (cat_name, "income") not in cat_map:
            create_category(cat_name, "income", "#10B981")
            
    # Refresh category map
    cat_map = {(c[1], c[2]): c[0] for c in get_categories()}
    
    today = datetime.now().date()
    total_added = 0
    
    random.seed(42)  # Deterministic seed for reproducible screenshots
    
    for month_offset in range(num_months - 1, -1, -1):
        # Base date for this month
        year = today.year
        month = today.month - month_offset
        while month <= 0:
            month += 12
            year -= 1
            
        # 1. Add monthly salary
        # 1. Add monthly salary
        salary_cat_id = cat_map.get(("Salary", "income"))
        if salary_cat_id:
            sal_day = min(1, 28)
            sal_date = f"{year:04d}-{month:02d}-{sal_day:02d}"
            cursor.execute(
                "INSERT INTO transactions (amount, category_id, type, date, note, name) VALUES (?, ?, 'income', ?, ?, ?)",
                (round(random.uniform(45000.0, 52000.0), 2), salary_cat_id, sal_date, "Primary employment compensation", "Salary")
            )
            total_added += 1
            
        # 2. Add freelance income occasionally
        if random.random() > 0.4:
            fl_cat_id = cat_map.get(("Freelance", "income"))
            if fl_cat_id:
                fl_day = random.randint(12, 20)
                fl_date = f"{year:04d}-{month:02d}-{fl_day:02d}"
                cursor.execute(
                    "INSERT INTO transactions (amount, category_id, type, date, note, name) VALUES (?, ?, 'income', ?, ?, ?)",
                    (round(random.uniform(8000.0, 16000.0), 2), fl_cat_id, fl_date, "Software consulting milestone", "Freelance Project")
                )
                total_added += 1

        # 3. Add funds allocation occasionally
        if random.random() > 0.6:
            funds_cat_id = cat_map.get(("Funds", "income"))
            if funds_cat_id:
                funds_day = random.randint(3, 10)
                funds_date = f"{year:04d}-{month:02d}-{funds_day:02d}"
                cursor.execute(
                    "INSERT INTO transactions (amount, category_id, type, date, note, name) VALUES (?, ?, 'income', ?, ?, ?)",
                    (round(random.uniform(5000.0, 25000.0), 2), funds_cat_id, funds_date, "Liquid capital & funds deposit", "Funds Allocation")
                )
                total_added += 1
                
        # 4. Add expense transactions spread across the month
        days_in_month = 28 if month == 2 else (30 if month in [4, 6, 9, 11] else 31)
        max_day = min(today.day if month_offset == 0 else days_in_month, days_in_month)
        
        for _ in range(transactions_per_month):
            cat_name, notes = random.choice(DEMO_EXPENSE_TEMPLATES)
            cat_id = cat_map.get((cat_name, "expense"))
            if not cat_id:
                continue
                
            day = random.randint(1, max(1, max_day))
            tx_date = f"{year:04d}-{month:02d}-{day:02d}"
            item_name = random.choice(notes)
            
            # Realistic amount distribution based on category
            if cat_name == "Food & Drinks":
                amount = round(random.uniform(100.0, 950.0), 2)
            elif cat_name == "Groceries":
                amount = round(random.uniform(300.0, 2200.0), 2)
            elif cat_name == "Transport":
                amount = round(random.uniform(50.0, 650.0), 2)
            elif cat_name == "Shopping":
                amount = round(random.uniform(400.0, 3200.0), 2)
            elif cat_name == "Utilities":
                amount = round(random.uniform(600.0, 2400.0), 2)
            elif cat_name == "Entertainment":
                amount = round(random.uniform(250.0, 1800.0), 2)
            elif cat_name == "Health & Fitness":
                amount = round(random.uniform(300.0, 2500.0), 2)
            elif cat_name == "Home":
                amount = round(random.uniform(400.0, 2800.0), 2)
            elif cat_name == "Savings":
                amount = round(random.uniform(2000.0, 8000.0), 2)
            elif cat_name == "Investments":
                amount = round(random.uniform(3000.0, 15000.0), 2)
            else:
                amount = round(random.uniform(500.0, 2000.0), 2)
                
            cursor.execute(
                "INSERT INTO transactions (amount, category_id, type, date, note, name) VALUES (?, ?, 'expense', ?, ?, ?)",
                (amount, cat_id, tx_date, "", item_name)
            )
            total_added += 1

    conn.commit()
    conn.close()
    return total_added

if __name__ == "__main__":
    count = load_demo_data()
    print(f"Successfully seeded {count} demo transactions.")
