from db.database import get_connection

CATEGORY_COLORS = ["#6FA8DC", "#A98AD2", "#E58A9B", "#D9A65D", "#65AF9A", "#62AFC2", "#D692B8", "#E59819", "#4ECDC4", "#FF6B6B"]

def _next_color(cursor):
    count = cursor.execute("SELECT COUNT(*) FROM categories").fetchone()[0]
    return CATEGORY_COLORS[count % len(CATEGORY_COLORS)]

def add_category(name, type, color=None):
    conn = get_connection()
    cursor = conn.cursor()
    color = color or _next_color(cursor)
    cursor.execute(
        "INSERT INTO categories (name, type, color) VALUES (?, ?, ?)",
        (name.strip(), type, color)
    )
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return new_id

create_category = add_category

def get_categories(type=None):
    conn = get_connection()
    cursor = conn.cursor()
    if type:
        cursor.execute("SELECT id, name, type, color FROM categories WHERE type = ? ORDER BY name ASC", (type,))
    else:
        cursor.execute("SELECT id, name, type, color FROM categories ORDER BY type DESC, name ASC")
    rows = cursor.fetchall()
    conn.close()
    return rows

def get_category_by_name(name, type=None):
    """Lookup or match a category case-insensitively. Useful during Excel import."""
    conn = get_connection()
    cursor = conn.cursor()
    if type:
        cursor.execute("SELECT id, name, type, color FROM categories WHERE LOWER(name) = LOWER(?) AND type = ? LIMIT 1", (name.strip(), type))
    else:
        cursor.execute("SELECT id, name, type, color FROM categories WHERE LOWER(name) = LOWER(?) LIMIT 1", (name.strip(),))
    row = cursor.fetchone()
    conn.close()
    return row

def get_or_create_category(name, type, color=None):
    existing = get_category_by_name(name, type)
    if existing:
        return existing[0]
    return add_category(name, type, color)

def update_category(category_id, name, type, color=None):
    conn = get_connection()
    cursor = conn.cursor()
    if color:
        cursor.execute("UPDATE categories SET name = ?, type = ?, color = ? WHERE id = ?", (name.strip(), type, color, category_id))
    else:
        cursor.execute("UPDATE categories SET name = ?, type = ? WHERE id = ?", (name.strip(), type, category_id))
    conn.commit()
    conn.close()

def delete_category(category_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM transactions WHERE category_id = ?", (category_id,))
    count = cursor.fetchone()[0]
    if count > 0:
        conn.close()
        return False  # in use, refuse to delete

    cursor.execute("DELETE FROM categories WHERE id = ?", (category_id,))
    conn.commit()
    conn.close()
    return True

def set_category_budget(category_id: int, monthly_budget: float):
    """Sets or updates the monthly budget threshold for a category."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO category_budgets (category_id, monthly_budget)
        VALUES (?, ?)
        ON CONFLICT(category_id) DO UPDATE SET monthly_budget = ?
    """, (category_id, float(monthly_budget), float(monthly_budget)))
    conn.commit()
    conn.close()

def get_category_budgets():
    """Returns mapping of category_id -> monthly_budget."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT category_id, monthly_budget FROM category_budgets")
    rows = dict(cursor.fetchall())
    conn.close()
    return rows

def get_category_budget_progress(start_date: str, end_date: str):
    """
    Returns combined list of categories with budget, actual spend in period,
    remaining budget, and progress percentage.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.id, c.name, c.color, b.monthly_budget,
               COALESCE(SUM(d.total_amount), 0.0) AS spent
        FROM categories c
        JOIN category_budgets b ON c.id = b.category_id
        LEFT JOIN daily_aggregates d ON c.id = d.category_id AND d.type = 'expense' AND d.date >= ? AND d.date <= ?
        WHERE c.type = 'expense'
        GROUP BY c.id, c.name, c.color, b.monthly_budget
        ORDER BY spent DESC
    """, (start_date, end_date))
    rows = []
    for cid, name, color, budget, spent in cursor.fetchall():
        rem = budget - spent
        pct = (spent / budget * 100.0) if budget > 0 else 0.0
        rows.append({
            "category_id": cid,
            "name": name,
            "color": color,
            "budget": budget,
            "spent": spent,
            "remaining": rem,
            "percent": min(round(pct, 1), 100.0)
        })
    conn.close()
    return rows
