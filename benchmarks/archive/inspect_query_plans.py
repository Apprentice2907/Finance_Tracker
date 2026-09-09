import sqlite3
import os
import json

def inspect_query_plans(db_path: str):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    queries = {
        "Q1: Dashboard Period Totals (Pre-Aggregated)": {
            "sql": "SELECT type, SUM(total_amount) FROM daily_aggregates WHERE date >= '2025-01-01' AND date <= '2025-12-31' GROUP BY type",
            "notes": "Queries daily_aggregates using covering index"
        },
        "Q2: Dashboard Period Totals (Raw Fallback)": {
            "sql": "SELECT type, SUM(amount) FROM transactions WHERE date >= '2025-01-01' AND date <= '2025-12-31' GROUP BY type",
            "notes": "Scans raw transactions table"
        },
        "Q3: Monthly Cashflow Trend (Pre-Aggregated)": {
            "sql": "SELECT strftime('%Y-%m', date) AS month, type, SUM(total_amount) FROM daily_aggregates WHERE date >= '2025-01-01' AND date <= '2025-12-31' GROUP BY month, type ORDER BY month",
            "notes": "Aggregates pre-computed daily totals by month"
        },
        "Q4: Category Breakdown with JOIN (Pre-Aggregated)": {
            "sql": """
                SELECT COALESCE(categories.name, 'Uncategorised'), SUM(daily_aggregates.total_amount), 
                       COALESCE(categories.color, '#6FA8DC'), SUM(daily_aggregates.transaction_count)
                FROM daily_aggregates
                LEFT JOIN categories ON daily_aggregates.category_id = categories.id
                WHERE daily_aggregates.type = 'expense' AND daily_aggregates.date >= '2025-01-01' AND daily_aggregates.date <= '2025-12-31'
                GROUP BY categories.name ORDER BY SUM(daily_aggregates.total_amount) DESC
            """,
            "notes": "Pre-aggregated category join"
        },
        "Q5: Category Breakdown with JOIN (Raw Table)": {
            "sql": """
                SELECT categories.name, SUM(transactions.amount), COUNT(transactions.id)
                FROM transactions
                JOIN categories ON transactions.category_id = categories.id
                WHERE transactions.type = 'expense' AND transactions.date >= '2025-01-01' AND transactions.date <= '2025-12-31'
                GROUP BY categories.name
                ORDER BY SUM(transactions.amount) DESC
            """,
            "notes": "Raw transaction join + aggregation"
        },
        "Q6: Transaction List Pagination & Sort (Date DESC)": {
            "sql": """
                SELECT transactions.id, transactions.type, transactions.amount,
                       transactions.category_id, COALESCE(categories.name, 'Uncategorised'), 
                       transactions.date, transactions.note, COALESCE(categories.color, '#6FA8DC')
                FROM transactions
                LEFT JOIN categories ON transactions.category_id = categories.id
                ORDER BY transactions.date DESC, transactions.id DESC
                LIMIT 50
            """,
            "notes": "Paginated transaction list sorted by date"
        },
        "Q7: Transaction List Amount Sort (Amount DESC)": {
            "sql": """
                SELECT transactions.id, transactions.type, transactions.amount,
                       transactions.category_id, COALESCE(categories.name, 'Uncategorised'), 
                       transactions.date, transactions.note, COALESCE(categories.color, '#6FA8DC')
                FROM transactions
                LEFT JOIN categories ON transactions.category_id = categories.id
                ORDER BY transactions.amount DESC, transactions.date DESC
                LIMIT 50
            """,
            "notes": "Paginated transaction list sorted by amount"
        },
        "Q8: Search Filter (LIKE %term%)": {
            "sql": """
                SELECT transactions.id, transactions.type, transactions.amount,
                       transactions.category_id, COALESCE(categories.name, 'Uncategorised'), 
                       transactions.date, transactions.note, COALESCE(categories.color, '#6FA8DC')
                FROM transactions
                LEFT JOIN categories ON transactions.category_id = categories.id
                WHERE (transactions.note LIKE '%coffee%' OR categories.name LIKE '%coffee%')
                LIMIT 50
            """,
            "notes": "Full substring search on note & category"
        },
        "Q9: Duplicate Check Lookup": {
            "sql": """
                SELECT id FROM transactions 
                WHERE type = 'expense' AND ABS(amount - 54.20) < 0.001 
                  AND category_id = 3
                  AND date = '2025-06-15' AND note = 'Lunch cafe'
                LIMIT 1
            """,
            "notes": "Single transaction duplicate verification"
        }
    }

    results = {}
    for name, item in queries.items():
        cur.execute(f"EXPLAIN QUERY PLAN {item['sql']}")
        plan_rows = cur.fetchall()
        # plan_rows: (id, parent, notused, detail)
        plan_details = [row[3] for row in plan_rows]
        results[name] = {
            "sql": item["sql"].strip(),
            "notes": item["notes"],
            "plan": plan_details
        }
        print(f"\n=== {name} ===")
        print(f"SQL: {item['sql'].strip()[:100]}...")
        for step in plan_details:
            print(f"  PLAN: {step}")

    conn.close()
    return results

if __name__ == "__main__":
    db_path = os.path.join(os.path.dirname(__file__), "datasets", "transactions_1m.db")
    inspect_query_plans(db_path)
