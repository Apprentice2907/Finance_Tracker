import os
import sqlite3
import sys

def get_db_path():
    """
    Returns a platform-safe path for the SQLite database.
    Checks environment, Android writable storage, and falls back gracefully.
    """
    env_db = os.environ.get("FINANCE_DB_PATH")
    if env_db:
        return env_db

    flet_storage = os.environ.get("FLET_APP_STORAGE_DATA")
    if flet_storage and os.path.exists(flet_storage):
        return os.path.join(flet_storage, "finance.db")
    
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    local_db = os.path.join(base_dir, "finance.db")
    
    try:
        test_file = os.path.join(base_dir, ".write_test")
        with open(test_file, "w") as f:
            f.write("ok")
        os.remove(test_file)
        return local_db
    except (OSError, IOError, PermissionError):
        pass

    user_home = os.path.expanduser("~")
    app_dir = os.path.join(user_home, ".finance_tracker")
    os.makedirs(app_dir, exist_ok=True)
    return os.path.join(app_dir, "finance.db")

DB_NAME = get_db_path()

def configure_sqlite_connection(conn: sqlite3.Connection):
    """
    Applies high-performance SQLite engine settings:
    - WAL Mode: Concurrent reads and fast append-only writes.
    - synchronous=NORMAL: Safe in WAL mode, eliminates fsync on every commit.
    - cache_size=-64000: 64MB in-memory page cache.
    - temp_store=MEMORY: Temporary sorting B-trees stored in RAM.
    - busy_timeout=5000: Prevents busy lock contention.
    """
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=-64000")
    conn.execute("PRAGMA temp_store=MEMORY")
    conn.execute("PRAGMA busy_timeout=5000")
    return conn

def get_connection(db_path: str = None):
    target = db_path or get_db_path()
    conn = sqlite3.connect(target)
    configure_sqlite_connection(conn)
    return conn

CURRENT_SCHEMA_VERSION = 2

def get_db_connection(db_path: str = None):
    return get_connection(db_path)

def init_db(db_path: str = None):
    """
    Initializes and migrates the database schema with transactional rollback safety.
    Tracks schema version using PRAGMA user_version.
    """
    conn = get_connection(db_path)
    cur = conn.cursor()

    # Read current schema version
    current_version = cur.execute("PRAGMA user_version").fetchone()[0]

    try:
        if current_version < 1:
            # Base Schema: categories, transactions, core indexes
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
                    name TEXT DEFAULT '',
                    FOREIGN KEY (category_id) REFERENCES categories(id)
                )
            """)

            cur.execute("CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_trans_composite ON transactions(type, date, category_id, amount)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_trans_cat_sort ON transactions(category_id, type, date DESC)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_trans_date_desc ON transactions(date DESC, id DESC)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_transactions_name ON transactions(name)")

        if current_version < 2:
            # Migration to V2: category_budgets, daily_aggregates summary table & sync triggers
            cur.execute("""
                CREATE TABLE IF NOT EXISTS category_budgets (
                    category_id INTEGER PRIMARY KEY,
                    monthly_budget REAL NOT NULL,
                    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
                )
            """)

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

            # Triggers to keep daily_aggregates in continuous sync
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

            cur.execute("""
                CREATE TRIGGER IF NOT EXISTS trg_trans_delete
                AFTER DELETE ON transactions
                BEGIN
                    UPDATE daily_aggregates
                    SET total_amount = total_amount - OLD.amount,
                        transaction_count = transaction_count - 1
                    WHERE date = OLD.date AND type = OLD.type AND category_id = COALESCE(OLD.category_id, 0);
                END;
            """)

            cur.execute("""
                CREATE TRIGGER IF NOT EXISTS trg_trans_update
                AFTER UPDATE ON transactions
                BEGIN
                    UPDATE daily_aggregates
                    SET total_amount = total_amount - OLD.amount,
                        transaction_count = transaction_count - 1
                    WHERE date = OLD.date AND type = OLD.type AND category_id = COALESCE(OLD.category_id, 0);

                    INSERT INTO daily_aggregates (date, type, category_id, total_amount, transaction_count)
                    VALUES (NEW.date, NEW.type, COALESCE(NEW.category_id, 0), NEW.amount, 1)
                    ON CONFLICT(date, type, category_id) DO UPDATE SET
                        total_amount = total_amount + NEW.amount,
                        transaction_count = transaction_count + 1;
                END;
            """)

            # Backfill daily_aggregates if migrating existing database with records
            agg_count = cur.execute("SELECT COUNT(*) FROM daily_aggregates").fetchone()[0]
            trans_count = cur.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
            if agg_count == 0 and trans_count > 0:
                cur.execute("""
                    INSERT INTO daily_aggregates (date, type, category_id, total_amount, transaction_count)
                    SELECT date, type, COALESCE(category_id, 0), SUM(amount), COUNT(id)
                    FROM transactions
                    GROUP BY date, type, COALESCE(category_id, 0)
                """)

            # Update schema version pragma
            cur.execute(f"PRAGMA user_version = {CURRENT_SCHEMA_VERSION}")

        # Ensure name column exists in transactions (migration safety)
        trans_cols = [col[1] for col in cur.execute("PRAGMA table_info(transactions)").fetchall()]
        if "name" not in trans_cols:
            cur.execute("ALTER TABLE transactions ADD COLUMN name TEXT DEFAULT ''")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_transactions_name ON transactions(name)")

        # Accounts table for tracking bank accounts, investments, wallets, and total balances
        cur.execute("""
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT 'bank',
                balance REAL NOT NULL DEFAULT 0.0,
                account_number TEXT DEFAULT '',
                color TEXT DEFAULT '#2962D6',
                updated_at TEXT
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type)")

        # Seed initial accounts if empty
        acc_count = cur.execute("SELECT COUNT(*) FROM accounts").fetchone()[0]
        if acc_count == 0:
            seed_accounts = [
                ("HDFC Bank", "bank", 0.0, "#004C8F"),
                ("SBI Bank", "bank", 0.0, "#280071"),
                ("Angel One", "investment", 0.0, "#E53935"),
                ("Cash in Hand", "wallet", 0.0, "#65AF9A"),
            ]
            for a_name, a_type, a_bal, a_col in seed_accounts:
                cur.execute(
                    "INSERT INTO accounts (name, type, balance, color, updated_at) VALUES (?, ?, ?, ?, datetime('now', 'localtime'))",
                    (a_name, a_type, a_bal, a_col)
                )

        # Default categories if empty
        cat_count = cur.execute("SELECT COUNT(*) FROM categories").fetchone()[0]
        if cat_count == 0:
            default_categories = [
                # Income
                ("Salary", "income", "#65AF9A"),
                ("Freelance", "income", "#62AFC2"),
                ("Funds", "income", "#6FA8DC"),
                ("Loans & Lending", "income", "#E59819"),
                # Expense
                ("Food & Drinks", "expense", "#E58A9B"),
                ("Groceries", "expense", "#D9A65D"),
                ("Shopping", "expense", "#A98AD2"),
                ("Transport", "expense", "#62AFC2"),
                ("Entertainment", "expense", "#6FA8DC"),
                ("Utilities", "expense", "#D692B8"),
                ("Health & Fitness", "expense", "#E59819"),
                ("Home", "expense", "#4ECDC4"),
                ("Savings", "expense", "#65AF9A"),
                ("Investments", "expense", "#6FA8DC"),
                ("Loans & Lending", "expense", "#E59819"),
            ]
            for name, kind, color in default_categories:
                cur.execute("INSERT INTO categories (name, type, color) VALUES (?, ?, ?)", (name, kind, color))
        else:
            # Harmonize legacy category names with the clean new categories
            rename_map = {
                "Food & Dining": "Food & Drinks",
                "Transportation": "Transport",
                "Bills & Utilities": "Utilities",
                "Healthcare": "Health & Fitness",
                "Health & Medical": "Health & Fitness",
            }
            for old_name, new_name in rename_map.items():
                cur.execute("UPDATE categories SET name = ? WHERE name = ? AND NOT EXISTS (SELECT 1 FROM categories WHERE name = ?)", (new_name, old_name, new_name))
            
            # Rename income 'Investments' to 'Funds'
            cur.execute("UPDATE categories SET name = 'Funds' WHERE name = 'Investments' AND type = 'income'")

            # Ensure standard income and expense categories exist
            standard_categories = [
                ("Salary", "income", "#65AF9A"),
                ("Freelance", "income", "#62AFC2"),
                ("Funds", "income", "#6FA8DC"),
                ("Loans & Lending", "income", "#E59819"),
                ("Groceries", "expense", "#D9A65D"),
                ("Health & Fitness", "expense", "#E59819"),
                ("Home", "expense", "#4ECDC4"),
                ("Savings", "expense", "#65AF9A"),
                ("Investments", "expense", "#6FA8DC"),
                ("Loans & Lending", "expense", "#E59819"),
            ]
            for name, kind, color in standard_categories:
                exists = cur.execute("SELECT 1 FROM categories WHERE name = ? AND type = ?", (name, kind)).fetchone()
                if not exists:
                    cur.execute("INSERT INTO categories (name, type, color) VALUES (?, ?, ?)", (name, kind, color))

        conn.commit()
    except Exception as e:
        conn.rollback()
        raise RuntimeError(f"Database migration failed and was rolled back: {e}") from e
    finally:
        conn.close()

if __name__ == "__main__":
    init_db()
    print(f"DB initialized at: {get_db_path()}")
