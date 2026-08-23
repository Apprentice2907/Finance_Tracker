from db.database import get_connection

def add_category(name, type):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO categories (name, type) VALUES (?, ?)",
        (name, type)
    )
    conn.commit()
    conn.close()

def get_categories(type=None):
    conn = get_connection()
    cursor = conn.cursor()
    if type:
        cursor.execute("SELECT * FROM categories WHERE type = ?", (type,))
    else:
        cursor.execute("SELECT * FROM categories")
    rows = cursor.fetchall()
    conn.close()
    return rows

def update_category(category_id, name, type):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE categories SET name = ?, type = ? WHERE id = ?",
        (name, type, category_id)
    )
    conn.commit()
    conn.close()





def delete_category(category_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM transactions WHERE category_id = ?", (category_id,))
    count = cursor.fetchone()[0]
    conn.close()

    if count > 0:
        return False  # in use, refuse to delete

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM categories WHERE id = ?", (category_id,))
    conn.commit()
    conn.close()
    return True