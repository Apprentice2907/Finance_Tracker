import sqlite3

import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_NAME = os.path.join(BASE_DIR, "finance.db")

def get_connection():
    conn=sqlite3.connect(DB_NAME)   
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def init_db():
    conn=get_connection()
    cur=conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS categories(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN('income','expense'))
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

    conn.commit()
    conn.close()


if __name__=="__main__":
    init_db()
    print("DB successful")
