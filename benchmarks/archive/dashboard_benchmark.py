import sqlite3
from typing import Dict, Any
from benchmarks.metrics import BenchmarkMetrics

def benchmark_dashboard_generation(db_path: str, start_date: str = "2025-06-01", end_date: str = "2025-06-30", prev_start: str = "2025-05-01", prev_end: str = "2025-05-31", year: int = 2025, iterations: int = 50) -> Dict[str, Any]:
    """
    Measures the end-to-end database query execution time required to render the dashboard:
    1. Current period totals (from daily_aggregates)
    2. Previous period comparison totals (from daily_aggregates)
    3. Category breakdown totals (JOIN + GROUP BY on daily_aggregates)
    4. 12-Month cashflow totals (sargable range query on daily_aggregates)
    5. Recent transactions (indexed date desc)
    """
    metrics = BenchmarkMetrics(name="dashboard_full_computation", iterations=iterations, warmups=10)

    start_year_d = f"{year}-01-01"
    end_year_d = f"{year}-12-31"

    def run_dashboard_queries():
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

        # Query 1: Current period totals
        cur.execute("SELECT type, SUM(total_amount) FROM daily_aggregates WHERE date >= ? AND date <= ? GROUP BY type", (start_date, end_date))
        tot_curr = dict(cur.fetchall())

        # Query 2: Previous period totals
        cur.execute("SELECT type, SUM(total_amount) FROM daily_aggregates WHERE date >= ? AND date <= ? GROUP BY type", (prev_start, prev_end))
        tot_prev = dict(cur.fetchall())

        # Query 3: Category totals
        cur.execute("""
            SELECT categories.name, SUM(daily_aggregates.total_amount), COALESCE(categories.color, '#6FA8DC'), SUM(daily_aggregates.transaction_count)
            FROM daily_aggregates
            LEFT JOIN categories ON daily_aggregates.category_id = categories.id
            WHERE daily_aggregates.type = 'expense' AND daily_aggregates.date >= ? AND daily_aggregates.date <= ?
            GROUP BY categories.name ORDER BY SUM(daily_aggregates.total_amount) DESC
        """, (start_date, end_date))
        cats = cur.fetchall()

        # Query 4: 12-Month overview (sargable range query)
        cur.execute("""
            SELECT strftime('%Y-%m', date) AS month, type, SUM(total_amount)
            FROM daily_aggregates
            WHERE date >= ? AND date <= ?
            GROUP BY month, type
            ORDER BY month
        """, (start_year_d, end_year_d))
        months = cur.fetchall()

        # Query 5: Recent transactions
        cur.execute("""
            SELECT transactions.id, transactions.type, transactions.amount,
                   transactions.category_id, COALESCE(categories.name, 'Uncategorised'), 
                   transactions.date, transactions.note, COALESCE(categories.color, '#6FA8DC')
            FROM transactions
            LEFT JOIN categories ON transactions.category_id = categories.id
            WHERE transactions.date >= ? AND transactions.date <= ?
            ORDER BY transactions.date DESC, transactions.id DESC
            LIMIT 6
        """, (start_date, end_date))
        txs = cur.fetchall()

        conn.close()
        return tot_curr, tot_prev, cats, months, txs

    return metrics.time_operation(run_dashboard_queries)
