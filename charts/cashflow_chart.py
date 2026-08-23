import matplotlib.pyplot as plt
import io
import base64
import flet as ft
from db.transactions import get_monthly_totals

def build_cashflow_chart():
    rows = get_monthly_totals()

    data = {}
    for month, t_type, amount in rows:
        data.setdefault(month, {"income": 0, "expense": 0})
        data[month][t_type] = amount

    months = sorted(data.keys())
    income_values = [data[m]["income"] for m in months]
    expense_values = [data[m]["expense"] for m in months]

    fig, ax = plt.subplots()
    ax.plot(months, income_values, label="Income", color="green", marker="o")
    ax.plot(months, expense_values, label="Expense", color="red", marker="o")
    ax.set_title("Cash Flow")
    ax.legend()
    plt.xticks(rotation=45)

    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode("utf-8")

    return ft.Image(src=f"data:image/png;base64,{img_base64}")
