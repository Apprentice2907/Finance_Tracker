import os
import sys
import random
import sqlite3
import argparse
import datetime
from typing import Optional

DEFAULT_CATEGORIES = [
    ("Salary", "income", "#65AF9A"),
    ("Freelance", "income", "#62AFC2"),
    ("Funds", "income", "#6FA8DC"),
    ("Loans & Lending", "income", "#E59819"),
    ("Rental Income", "income", "#A98AD2"),
    ("Dividends", "income", "#65AF9A"),
    ("Food & Dining", "expense", "#E58A9B"),
    ("Groceries", "expense", "#D9A65D"),
    ("Transportation", "expense", "#62AFC2"),
    ("Shopping", "expense", "#A98AD2"),
    ("Bills & Utilities", "expense", "#D692B8"),
    ("Entertainment", "expense", "#6FA8DC"),
    ("Health & Medical", "expense", "#E59819"),
    ("Investments", "expense", "#6FA8DC"),
    ("Loans & Lending", "expense", "#E59819"),
    ("Education", "expense", "#4ECDC4"),
    ("Travel & Lodging", "expense", "#FF6B6B"),
    ("Home & Maintenance", "expense", "#D9A65D"),
]

SAMPLE_NOTES = [
    "Lunch with colleagues at downtown cafe",
    "Monthly broadband and internet bill",
    "Grocery store run for fresh vegetables and milk",
    "Uber ride to international airport terminal",
    "Client project milestone delivery bonus",
    "Movie tickets with family and popcorn",
    "Quarterly electricity power bill payment",
    "Stock dividend quarterly payout credited",
    "Annual gym membership subscription renewal",
    "Coffee and snack during afternoon break",
    "Amazon electronics purchase and cables",
    "Dinner buffet with friends on weekend",
    "Pharmacy prescription medications",
    "Gas station vehicle refuel",
    "Monthly apartment rental payment",
    "",
    None,
]

def init_benchmark_db(db_path: str):
    """Initializes schema in an isolated benchmark database file."""
    if os.path.exists(db_path):
        os.remove(db_path)
    os.makedirs(os.path.dirname(db_path), exist_ok=True)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS categories(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN('income','expense')),
            color TEXT
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
            amount REAL NOT NULL,
            category_id INTEGER,
            date TEXT NOT NULL,
            note TEXT,
            FOREIGN KEY (category_id) REFERENCES categories(id)
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_trans_composite ON transactions(type, date, category_id, amount)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_trans_cat_sort ON transactions(category_id, type, date DESC)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_trans_date_desc ON transactions(date DESC, id DESC)")

    # Pre-Aggregated Summary Table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS daily_aggregates (
            date TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
            category_id INTEGER,
            total_amount REAL NOT NULL DEFAULT 0.0,
            transaction_count INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (date, type, category_id)
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_daily_agg_date ON daily_aggregates(date)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_daily_agg_type_date ON daily_aggregates(type, date)")

    cur.execute("""
        CREATE TRIGGER IF NOT EXISTS trg_trans_insert
        AFTER INSERT ON transactions
        BEGIN
            INSERT INTO daily_aggregates (date, type, category_id, total_amount, transaction_count)
            VALUES (NEW.date, NEW.type, COALESCE(NEW.category_id, 0), NEW.amount, 1)
            ON CONFLICT(date, type, category_id) DO UPDATE SET
                total_amount = total_amount + NEW.amount,
                transaction_count = transaction_count + 1;
        END;
    """)

    conn.commit()
    conn.close()

def generate_dataset(
    output_path: str,
    row_count: int = 100_000,
    seed: int = 42,
    distribution: str = "normal",
    batch_size: int = 10_000
) -> str:
    """
    Generates a deterministic synthetic dataset of `row_count` transactions.
    """
    random.seed(seed)
    init_benchmark_db(output_path)

    conn = sqlite3.connect(output_path)
    cur = conn.cursor()

    # 1. Populate Categories
    categories = list(DEFAULT_CATEGORIES)
    if distribution == "many_categories":
        for i in range(15, 60):
            kind = "expense" if i % 4 != 0 else "income"
            categories.append((f"Custom Category {i}", kind, "#6FA8DC"))

    cat_map = {"income": [], "expense": []}
    for name, kind, color in categories:
        cur.execute("INSERT INTO categories (name, type, color) VALUES (?, ?, ?)", (name, kind, color))
        cat_id = cur.lastrowid
        cat_map[kind].append(cat_id)

    # 2. Date range setup (spanning over 3 years: 2024-01-01 to 2026-12-31)
    start_date = datetime.date(2024, 1, 1)
    total_days = 365 * 3

    # Distribution probabilities
    income_prob = 0.20
    if distribution == "income_heavy":
        income_prob = 0.80
    elif distribution == "expense_heavy":
        income_prob = 0.05

    # 3. Generate Transactions in memory chunks
    rows_generated = 0
    buffer = []

    for i in range(row_count):
        # Choose transaction type
        is_income = (random.random() < income_prob)
        t_type = "income" if is_income else "expense"
        cat_id = random.choice(cat_map[t_type]) if cat_map[t_type] else None

        # Amount generation
        if is_income:
            amount = round(random.choice([25000, 45000, 65000, 85000, 120000]) * random.uniform(0.9, 1.1), 2)
        else:
            amount = round(random.expovariate(1 / 450.0) + 20.0, 2)
            if random.random() < 0.05:  # occasional big expense
                amount = round(random.uniform(5000, 35000), 2)

        # Date distribution
        if distribution == "heavy_same_day":
            # Clustered into specific days
            day_offset = (i // 50) % total_days
        else:
            day_offset = random.randint(0, total_days - 1)
        
        tx_date = (start_date + datetime.timedelta(days=day_offset)).strftime("%Y-%m-%d")

        # Note generation
        if distribution == "large_notes":
            note = f"Transaction #{i}: " + ("Detailed memo and description line item. " * random.randint(3, 8))
        else:
            note = random.choice(SAMPLE_NOTES)

        buffer.append((t_type, amount, cat_id, tx_date, note))
        rows_generated += 1

        if len(buffer) >= batch_size:
            cur.executemany(
                "INSERT INTO transactions (type, amount, category_id, date, note) VALUES (?, ?, ?, ?, ?)",
                buffer
            )
            conn.commit()
            buffer.clear()

    if buffer:
        cur.executemany(
            "INSERT INTO transactions (type, amount, category_id, date, note) VALUES (?, ?, ?, ?, ?)",
            buffer
        )
        conn.commit()
        buffer.clear()

    conn.close()
    return output_path

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Deterministic Synthetic Finance Dataset Generator")
    parser.add_argument("--rows", type=int, default=100000, help="Number of transaction rows (e.g. 10000, 100000, 1000000)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument("--distribution", type=str, default="normal", choices=["normal", "heavy_same_day", "many_categories", "large_notes", "income_heavy", "expense_heavy"])
    parser.add_argument("--output", type=str, default=None, help="Output database file path")

    args = parser.parse_args()
    
    if args.output is None:
        rows_str = f"{args.rows//1000}k" if args.rows < 1_000_000 else f"{args.rows//1_000_000}m"
        out = os.path.join(os.path.dirname(__file__), "datasets", f"transactions_{rows_str}.db")
    else:
        out = args.output

    print(f"Generating {args.rows:,} transactions with distribution='{args.distribution}' (seed={args.seed})...")
    path = generate_dataset(out, row_count=args.rows, seed=args.seed, distribution=args.distribution)
    size_mb = os.path.getsize(path) / (1024 * 1024)
    print(f"Dataset generated successfully at: {path} ({size_mb:.2f} MB)")
