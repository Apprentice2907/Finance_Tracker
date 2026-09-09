import datetime
import calendar
from typing import List, Dict, Any, Optional
from db.database import get_connection, get_db_path
from db.transactions import get_totals, get_category_totals

def generate_financial_insights(db_path: str = None) -> List[Dict[str, Any]]:
    """
    Computes deterministic, rule-based personal finance insights using SQL/Python math.
    Returns a curated list of actionable insights (max 4-5) with icons, tone, and descriptions.
    """
    target = db_path or get_db_path()
    conn = get_connection(target)
    cur = conn.cursor()

    insights: List[Dict[str, Any]] = []

    today = datetime.date.today()
    this_month_start = today.strftime("%Y-%m-01")
    # Last month calculation
    first_of_this_month = today.replace(day=1)
    last_day_of_last_month = first_of_this_month - datetime.timedelta(days=1)
    last_month_start = last_day_of_last_month.strftime("%Y-%m-01")
    last_month_end = last_day_of_last_month.strftime("%Y-%m-%d")

    # 1. Month-over-Month Expense Comparison Insight
    cur.execute("""
        SELECT COALESCE(SUM(total_amount), 0.0) 
        FROM daily_aggregates 
        WHERE type = 'expense' AND date >= ? AND date <= ?
    """, (this_month_start, today.strftime("%Y-%m-%d")))
    this_month_expense = cur.fetchone()[0]

    cur.execute("""
        SELECT COALESCE(SUM(total_amount), 0.0) 
        FROM daily_aggregates 
        WHERE type = 'expense' AND date >= ? AND date <= ?
    """, (last_month_start, last_month_end))
    last_month_expense = cur.fetchone()[0]

    if last_month_expense > 0 and this_month_expense > 0:
        diff_pct = ((this_month_expense - last_month_expense) / last_month_expense) * 100.0
        if diff_pct > 5.0:
            insights.append({
                "type": "warning",
                "icon": "trending_up",
                "title": "Spending Increased",
                "message": f"Your spending this month (₹{this_month_expense:,.0f}) is {diff_pct:.1f}% higher than last month (₹{last_month_expense:,.0f}).",
                "accent_color": "#D65B67"
            })
        elif diff_pct < -5.0:
            insights.append({
                "type": "positive",
                "icon": "trending_down",
                "title": "Spending Reduced",
                "message": f"Great job! Your spending is {abs(diff_pct):.1f}% lower than last month.",
                "accent_color": "#159B72"
            })

    # 2. Top Spending Category Insight
    cat_rows = get_category_totals(t_type="expense", start_date=this_month_start, end_date=today.strftime("%Y-%m-%d"))
    if cat_rows and len(cat_rows) > 0 and cat_rows[0][1] > 0:
        top_cat_name = cat_rows[0][0]
        top_cat_amount = cat_rows[0][1]
        top_cat_pct = (top_cat_amount / this_month_expense * 100.0) if this_month_expense > 0 else 0.0
        insights.append({
            "type": "info",
            "icon": "pie_chart",
            "title": "Top Spending Category",
            "message": f"{top_cat_name} is your largest expense category this month (₹{top_cat_amount:,.0f}, {top_cat_pct:.0f}% of total spending).",
            "accent_color": "#2962D6"
        })

    # 3. Peak Day of the Week Analysis (Last 90 Days)
    ninety_days_ago = (today - datetime.timedelta(days=90)).strftime("%Y-%m-%d")
    cur.execute("""
        SELECT strftime('%w', date) AS day_of_week, SUM(amount) AS total
        FROM transactions
        WHERE type = 'expense' AND date >= ?
        GROUP BY day_of_week
        ORDER BY total DESC
        LIMIT 1
    """, (ninety_days_ago,))
    peak_day_row = cur.fetchone()

    day_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    if peak_day_row and peak_day_row[0] is not None:
        day_idx = int(peak_day_row[0])
        day_name = day_names[day_idx]
        insights.append({
            "type": "neutral",
            "icon": "calendar_today",
            "title": "Peak Spending Day",
            "message": f"You tend to spend the most on {day_name}s over the last 90 days.",
            "accent_color": "#D9A65D"
        })

    # 4. Savings Rate Insight
    cur.execute("""
        SELECT COALESCE(SUM(total_amount), 0.0) 
        FROM daily_aggregates 
        WHERE type = 'income' AND date >= ? AND date <= ?
    """, (this_month_start, today.strftime("%Y-%m-%d")))
    this_month_income = cur.fetchone()[0]

    if this_month_income > 0:
        savings = this_month_income - this_month_expense
        savings_rate = (savings / this_month_income) * 100.0
        if savings_rate >= 20.0:
            insights.append({
                "type": "positive",
                "icon": "savings",
                "title": "Healthy Savings Rate",
                "message": f"You have saved ₹{savings:,.0f} ({savings_rate:.0f}% of income) this month.",
                "accent_color": "#159B72"
            })
        elif savings_rate < 0.0:
            insights.append({
                "type": "warning",
                "icon": "warning_amber",
                "title": "Expenses Exceed Income",
                "message": f"Expenses exceed income by ₹{abs(savings):,.0f} this month.",
                "accent_color": "#D65B67"
            })

    conn.close()
    return insights
