import collections
from db.database import get_connection
from utils.observability import METRICS, trace_operation

# In-Memory Bounded LRU Query Cache (Max 128 entries)
class LRUQueryCache:
    def __init__(self, capacity: int = 128):
        self.capacity = capacity
        self.cache = collections.OrderedDict()

    def get(self, key):
        if key in self.cache:
            self.cache.move_to_end(key)
            METRICS.record_cache_hit()
            return self.cache[key]
        METRICS.record_cache_miss()
        return None

    def put(self, key, value):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)

    def clear(self):
        self.cache.clear()

_QUERY_CACHE = LRUQueryCache(capacity=128)

def invalidate_cache():
    _QUERY_CACHE.clear()
    METRICS.record_cache_invalidation()

def add_transaction(type, amount, category_id, date, note="", name=""):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO transactions (type, amount, category_id, date, note, name) VALUES (?, ?, ?, ?, ?, ?)",
        (type, float(amount), category_id, str(date), note or "", name or "")
    )
    conn.commit()
    conn.close()
    invalidate_cache()

def get_transactions(start_date=None, end_date=None, category_id=None, transaction_type=None, search_query=None, sort_by="date_desc", limit=None):
    conn = get_connection()
    cursor = conn.cursor()
    query = """
        SELECT transactions.id, transactions.type, transactions.amount,
               transactions.category_id, COALESCE(categories.name, 'Uncategorised'), 
               transactions.date, transactions.note, COALESCE(categories.color, '#6FA8DC'),
               COALESCE(transactions.name, '')
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
    if category_id is not None and category_id != "" and category_id != "all":
        query += " AND transactions.category_id = ?"
        params.append(category_id)
    if transaction_type and transaction_type in ("income", "expense"):
        query += " AND transactions.type = ?"
        params.append(transaction_type)
    if search_query:
        s = f"%{search_query.strip()}%"
        query += " AND (COALESCE(transactions.name, '') LIKE ? OR transactions.note LIKE ? OR categories.name LIKE ? OR CAST(transactions.amount AS TEXT) LIKE ?)"
        params.extend([s, s, s, s])

    # Sorting
    if sort_by == "date_asc":
        query += " ORDER BY transactions.date ASC, transactions.id ASC"
    elif sort_by == "amount_desc":
        query += " ORDER BY transactions.amount DESC, transactions.date DESC"
    elif sort_by == "amount_asc":
        query += " ORDER BY transactions.amount ASC, transactions.date DESC"
    else:  # default date_desc
        query += " ORDER BY transactions.date DESC, transactions.id DESC"

    if limit and isinstance(limit, int) and limit > 0:
        query += f" LIMIT {limit}"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return rows

def update_transaction(transaction_id, type, amount, category_id, date, note="", name=""):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE transactions SET type=?, amount=?, category_id=?, date=?, note=?, name=? WHERE id=?",
        (type, float(amount), category_id, str(date), note or "", name or "", transaction_id)
    )
    conn.commit()
    conn.close()
    invalidate_cache()

def delete_transaction(transaction_id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM transactions WHERE id = ?", (transaction_id,))
    conn.commit()
    conn.close()
    invalidate_cache()

def get_totals(start_date=None, end_date=None):
    cache_key = ("get_totals", start_date, end_date)
    cached = _QUERY_CACHE.get(cache_key)
    if cached is not None:
        return cached

    conn = get_connection()
    cursor = conn.cursor()

    # Query from pre-aggregated daily_aggregates table for fast O(1) retrieval
    query = "SELECT type, SUM(total_amount) FROM daily_aggregates WHERE 1=1"
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
    
    # Fallback to transactions if aggregates empty
    if not rows:
        q_raw = "SELECT type, SUM(amount) FROM transactions WHERE 1=1"
        p_raw = []
        if start_date:
            q_raw += " AND date >= ?"
            p_raw.append(start_date)
        if end_date:
            q_raw += " AND date <= ?"
            p_raw.append(end_date)
        q_raw += " GROUP BY type"
        cursor.execute(q_raw, p_raw)
        rows = cursor.fetchall()

    conn.close()
    result = dict(rows)
    _QUERY_CACHE.put(cache_key, result)
    return result

def get_monthly_totals(year=None):
    cache_key = ("get_monthly_totals", year)
    cached = _QUERY_CACHE.get(cache_key)
    if cached is not None:
        return cached

    conn = get_connection()
    cursor = conn.cursor()

    if year:
        start_d = f"{year}-01-01"
        end_d = f"{year}-12-31"
        cursor.execute("""
            SELECT strftime('%Y-%m', date) AS month, type, SUM(total_amount)
            FROM daily_aggregates
            WHERE date >= ? AND date <= ?
            GROUP BY month, type
            ORDER BY month
        """, (start_d, end_d))
    else:
        cursor.execute("""
            SELECT strftime('%Y-%m', date) AS month, type, SUM(total_amount)
            FROM daily_aggregates
            GROUP BY month, type
            ORDER BY month
        """)
    rows = cursor.fetchall()
    
    # Fallback if aggregates table not populated
    if not rows:
        if year:
            start_d = f"{year}-01-01"
            end_d = f"{year}-12-31"
            cursor.execute("""
                SELECT strftime('%Y-%m', date) AS month, type, SUM(amount)
                FROM transactions
                WHERE date >= ? AND date <= ?
                GROUP BY month, type
                ORDER BY month
            """, (start_d, end_d))
        else:
            cursor.execute("""
                SELECT strftime('%Y-%m', date) AS month, type, SUM(amount)
                FROM transactions
                GROUP BY month, type
                ORDER BY month
            """)
        rows = cursor.fetchall()

    conn.close()
    _QUERY_CACHE.put(cache_key, rows)
    return rows

def get_daily_totals(start_date, end_date, t_type="expense"):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT date, SUM(total_amount)
        FROM daily_aggregates
        WHERE type = ? AND date >= ? AND date <= ?
        GROUP BY date
        ORDER BY date
    """, (t_type, start_date, end_date))
    rows = cursor.fetchall()
    if not rows:
        cursor.execute("""
            SELECT date, SUM(amount)
            FROM transactions
            WHERE type = ? AND date >= ? AND date <= ?
            GROUP BY date
            ORDER BY date
        """, (t_type, start_date, end_date))
        rows = cursor.fetchall()
    conn.close()
    return rows

def get_category_totals(t_type="expense", start_date=None, end_date=None):
    cache_key = ("get_category_totals", t_type, start_date, end_date)
    cached = _QUERY_CACHE.get(cache_key)
    if cached is not None:
        return cached

    conn = get_connection()
    cursor = conn.cursor()

    query = """
        SELECT COALESCE(categories.name, 'Uncategorised'), SUM(daily_aggregates.total_amount), 
               COALESCE(categories.color, '#6FA8DC'), SUM(daily_aggregates.transaction_count)
        FROM daily_aggregates
        LEFT JOIN categories ON daily_aggregates.category_id = categories.id
        WHERE daily_aggregates.type = ?
    """
    params = [t_type]
    if start_date:
        query += " AND daily_aggregates.date >= ?"
        params.append(start_date)
    if end_date:
        query += " AND daily_aggregates.date <= ?"
        params.append(end_date)
    query += " GROUP BY categories.name ORDER BY SUM(daily_aggregates.total_amount) DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()

    if not rows:
        # Fallback to direct transactions query
        q_raw = """
            SELECT COALESCE(categories.name, 'Uncategorised'), SUM(transactions.amount), 
                   COALESCE(categories.color, '#6FA8DC'), COUNT(transactions.id)
            FROM transactions
            LEFT JOIN categories ON transactions.category_id = categories.id
            WHERE transactions.type = ?
        """
        p_raw = [t_type]
        if start_date:
            q_raw += " AND transactions.date >= ?"
            p_raw.append(start_date)
        if end_date:
            q_raw += " AND transactions.date <= ?"
            p_raw.append(end_date)
        q_raw += " GROUP BY categories.name ORDER BY SUM(transactions.amount) DESC"
        cursor.execute(q_raw, p_raw)
        rows = cursor.fetchall()

    conn.close()
    _QUERY_CACHE.put(cache_key, rows)
    return rows

def check_duplicate_transaction(type_val, amount, category_id, date_val, note_val):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id FROM transactions 
        WHERE type = ? AND ABS(amount - ?) < 0.001 
          AND (category_id = ? OR (category_id IS NULL AND ? IS NULL))
          AND date = ? AND (note = ? OR (note IS NULL AND (? IS NULL OR ? = '')))
        LIMIT 1
    """, (type_val, float(amount), category_id, category_id, str(date_val), note_val or "", note_val, note_val))
    row = cursor.fetchone()
    conn.close()
    return row is not None

def bulk_insert_transactions(transactions_to_insert, skip_duplicates=True, batch_size=2000):
    """
    High-performance batched transaction insertion with in-memory duplicate checking.
    Inserts a list of tuples: (type, amount, category_id, date, note)
    Returns: (inserted_count, skipped_count)
    """
    if not transactions_to_insert:
        return 0, 0

    conn = get_connection()
    cursor = conn.cursor()
    inserted = 0
    skipped = 0

    # Build date range window to pre-fetch existing transactions for in-memory O(1) duplicate checks
    if skip_duplicates:
        dates = [item[3] for item in transactions_to_insert if item[3]]
        if dates:
            min_date, max_date = min(dates), max(dates)
            cursor.execute("""
                SELECT type, ROUND(amount, 2), COALESCE(category_id, 0), date, COALESCE(note, '')
                FROM transactions
                WHERE date >= ? AND date <= ?
            """, (min_date, max_date))
            existing_set = set(cursor.fetchall())
        else:
            existing_set = set()
    else:
        existing_set = set()

    to_insert_buffer = []

    for item in transactions_to_insert:
        if len(item) >= 6:
            t_type, amount, cat_id, date_str, note, name = item[:6]
        else:
            t_type, amount, cat_id, date_str, note = item[:5]
            name = ""
        sig = (t_type, round(float(amount), 2), cat_id or 0, str(date_str), note or "", name or "")
        
        if skip_duplicates and sig in existing_set:
            skipped += 1
            continue

        existing_set.add(sig)
        to_insert_buffer.append((t_type, float(amount), cat_id, str(date_str), note or "", name or ""))
        inserted += 1

        if len(to_insert_buffer) >= batch_size:
            cursor.executemany(
                "INSERT INTO transactions (type, amount, category_id, date, note, name) VALUES (?, ?, ?, ?, ?, ?)",
                to_insert_buffer
            )
            conn.commit()
            to_insert_buffer.clear()

    if to_insert_buffer:
        cursor.executemany(
            "INSERT INTO transactions (type, amount, category_id, date, note, name) VALUES (?, ?, ?, ?, ?, ?)",
            to_insert_buffer
        )
        conn.commit()
        to_insert_buffer.clear()

    conn.close()
    invalidate_cache()
    return inserted, skipped
