import datetime
from db.database import get_connection

ACCOUNT_TYPES = [
    ("bank", "Bank Account"),
    ("investment", "Investment / Demat"),
    ("wallet", "Cash / Wallet"),
    ("savings", "Savings / FD"),
    ("credit", "Credit Card"),
    ("other", "Other Asset")
]

def get_accounts():
    """Returns all accounts ordered by balance descending, then name."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, name, type, balance, COALESCE(account_number, ''), COALESCE(color, '#2962D6'), COALESCE(updated_at, '')
        FROM accounts
        ORDER BY balance DESC, name ASC
    """)
    rows = cur.fetchall()
    conn.close()
    return rows

def get_account(account_id: int):
    """Returns a single account by ID."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, name, type, balance, COALESCE(account_number, ''), COALESCE(color, '#2962D6'), COALESCE(updated_at, '')
        FROM accounts
        WHERE id = ?
    """, (account_id,))
    row = cur.fetchone()
    conn.close()
    return row

def add_account(name: str, type_val: str = "bank", balance: float = 0.0, account_number: str = "", color: str = "#2962D6") -> int:
    """Creates a new account."""
    conn = get_connection()
    cur = conn.cursor()
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cur.execute("""
        INSERT INTO accounts (name, type, balance, account_number, color, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (name.strip(), type_val, float(balance), account_number.strip(), color, now_str))
    new_id = cur.lastrowid
    conn.commit()
    conn.close()
    return new_id

def update_account(account_id: int, name: str, type_val: str, balance: float, account_number: str = "", color: str = "#2962D6"):
    """Updates an existing account's details and balance."""
    conn = get_connection()
    cur = conn.cursor()
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cur.execute("""
        UPDATE accounts
        SET name = ?, type = ?, balance = ?, account_number = ?, color = ?, updated_at = ?
        WHERE id = ?
    """, (name.strip(), type_val, float(balance), account_number.strip(), color, now_str, account_id))
    conn.commit()
    conn.close()

def update_account_balance(account_id: int, new_balance: float):
    """Fast inline update for account balance."""
    conn = get_connection()
    cur = conn.cursor()
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cur.execute("""
        UPDATE accounts
        SET balance = ?, updated_at = ?
        WHERE id = ?
    """, (float(new_balance), now_str, account_id))
    conn.commit()
    conn.close()

def delete_account(account_id: int):
    """Deletes an account."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM accounts WHERE id = ?", (account_id,))
    conn.commit()
    conn.close()

def get_total_balance() -> float:
    """Returns the grand total balance across all accounts."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT SUM(balance) FROM accounts")
    row = cur.fetchone()
    conn.close()
    return float(row[0]) if (row and row[0] is not None) else 0.0

def get_balances_by_type():
    """Returns total balance grouped by account type."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT type, SUM(balance), COUNT(id)
        FROM accounts
        GROUP BY type
        ORDER BY SUM(balance) DESC
    """)
    rows = cur.fetchall()
    conn.close()
    return rows
