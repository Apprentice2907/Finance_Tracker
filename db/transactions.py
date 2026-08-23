from db.database import get_connection

def add_transaction(type,amount,category_id,date,note=""):
    conn=get_connection()
    cur=conn.cursor()
    cur.execute(
        "INSERT INTO transactions (type, amount, category_id, date, note) VALUES (?, ?, ?, ?, ?)",
        (type, amount, category_id, date, note)
    )
 
    conn.commit()
    conn.close()


def get_transactions(start_date=None, end_date=None, category_id=None):
    conn = get_connection()
    cursor = conn.cursor()
    query = """
        SELECT transactions.id, transactions.type, transactions.amount,
               transactions.category_id, COALESCE(categories.name, '—'), transactions.date, transactions.note
        FROM transactions
        LEFT JOIN categories ON transactions.category_id = categories.id
        WHERE 1=1
    """
    params = []
    if start_date:
        query += " AND transactions.date >= ?"
        params.append(start_date)
    if end_date:
        query += " AND transactions.date <= ?"
        params.append(end_date)
    if category_id:
        query += " AND transactions.category_id = ?"
        params.append(category_id)
    query += " ORDER BY transactions.date DESC, transactions.id DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return rows


def update_transaction(transaction_id, type, amount, category_id, date, note=""):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE transactions SET type=?, amount=?, category_id=?, date=?, note=? WHERE id=?",
        (type, amount, category_id, date, note, transaction_id)
    )
    conn.commit()
    conn.close()

def delete_transaction(transaction_id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM transactions WHERE id = ?", (transaction_id,))
    conn.commit()
    conn.close()


def get_totals(start_date=None, end_date=None):
    conn = get_connection()
    cursor = conn.cursor()

    query = """
        SELECT type, SUM(amount) 
        FROM transactions 
        WHERE 1=1
    """
    params = []
    if start_date:
        query += " AND date >= ?"
        params.append(start_date)
    if end_date:
        query += " AND date <= ?"
        params.append(end_date)
    query += " GROUP BY type"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return dict(rows)


def get_monthly_totals():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT strftime('%Y-%m', date) AS month, type, SUM(amount)
        FROM transactions
        GROUP BY month, type
        ORDER BY month
    """)
    rows = cursor.fetchall()
    conn.close()
    return rows

def get_category_totals(t_type="expense"):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT categories.name, SUM(transactions.amount)
        FROM transactions
        JOIN categories ON transactions.category_id = categories.id
        WHERE transactions.type = ?
        GROUP BY categories.name
    """, (t_type,))
    rows = cursor.fetchall()
    conn.close()
    return rows
