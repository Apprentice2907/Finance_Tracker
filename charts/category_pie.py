import matplotlib.pyplot as plt
import io
import base64
import flet as ft
from db.transactions import get_category_totals

def build_category_pie():
    rows = get_category_totals("expense")

    if not rows:
        return ft.Text("No expense data yet.")

    labels = [r[0] for r in rows]
    values = [r[1] for r in rows]

    fig, ax = plt.subplots()
    ax.pie(values, labels=labels, autopct="%1.1f%%")
    ax.set_title("Expenses by Category")

    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode("utf-8")

    return ft.Image(src=f"data:image/png;base64,{img_base64}")
