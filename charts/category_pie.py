import base64
import io

import flet as ft
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from db.categories import CATEGORY_COLORS, get_categories
from db.transactions import get_category_totals

def build_category_pie(selected_type="expense", start_date=None, end_date=None, is_mobile=False):
    rows = get_category_totals(selected_type, start_date, end_date)
    # Filter to only entries with strictly positive amounts (> 0)
    valid_rows = [r for r in rows if r[1] is not None and float(r[1]) > 0] if rows else []

    if not valid_rows or sum(float(r[1]) for r in valid_rows) <= 0:
        return ft.Container(
            ft.Column([
                ft.Icon(ft.Icons.PIE_CHART_OUTLINE, color="#B3BBC7", size=28),
                ft.Text("No category data", color="#7A8494", size=12),
            ], alignment=ft.MainAxisAlignment.CENTER, horizontal_alignment=ft.CrossAxisAlignment.CENTER, spacing=4),
            alignment=ft.Alignment(0, 0),
            height=160 if is_mobile else 180,
            expand=True
        )

    color_by_name = {name: color or CATEGORY_COLORS[i % len(CATEGORY_COLORS)] for i, (_, name, _, color) in enumerate(get_categories())}
    values = [float(value) for _, value, _, _ in valid_rows]
    names = [name for name, _, _, _ in valid_rows]
    colors = [color_by_name.get(name, CATEGORY_COLORS[i % len(CATEGORY_COLORS)]) for i, name in enumerate(names)]
    total = sum(values)

    fig_size = (2.8, 2.2) if is_mobile else (3.2, 2.5)
    dpi = 120 if is_mobile else 140

    fig, ax = plt.subplots(figsize=fig_size, dpi=dpi)
    fig.patch.set_facecolor("#FFFFFF")
    ax.set_facecolor("#FFFFFF")
    ax.set_aspect("equal")

    try:
        # Donut chart
        wedges, _ = ax.pie(
            values,
            colors=colors,
            startangle=90,
            counterclock=False,
            wedgeprops={"width": 0.32, "edgecolor": "#FFFFFF", "linewidth": 2.5}
        )
    except Exception:
        plt.close(fig)
        return ft.Container(
            ft.Column([
                ft.Icon(ft.Icons.PIE_CHART_OUTLINE, color="#B3BBC7", size=28),
                ft.Text("No category data", color="#7A8494", size=12),
            ], alignment=ft.MainAxisAlignment.CENTER, horizontal_alignment=ft.CrossAxisAlignment.CENTER, spacing=4),
            alignment=ft.Alignment(0, 0),
            height=160 if is_mobile else 180,
            expand=True
        )

    # Center text formatting
    if total >= 10000000:
        total_str = f"₹{total/10000000:.1f}Cr"
    elif total >= 100000:
        total_str = f"₹{total/100000:.1f}L"
    elif total >= 1000:
        total_str = f"₹{total/1000:.1f}K"
    else:
        total_str = f"₹{total:,.0f}"

    ax.text(0.5, 0.53, total_str, transform=ax.transAxes, ha="center", va="center", fontsize=10 if is_mobile else 11, fontweight="bold", color="#18212F")
    ax.text(0.5, 0.40, selected_type.title(), transform=ax.transAxes, ha="center", va="center", fontsize=7 if is_mobile else 8, color="#7A8494")
    ax.set_axis_off()

    buffer = io.BytesIO()
    fig.savefig(buffer, format="png", bbox_inches="tight", pad_inches=0.02)
    plt.close(fig)

    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return ft.Image(src=f"data:image/png;base64,{encoded}", fit=ft.BoxFit.CONTAIN, height=150 if is_mobile else 180)
