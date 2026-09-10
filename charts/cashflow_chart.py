import base64
import io
import calendar
import datetime

import flet as ft
import matplotlib
matplotlib.use("Agg")  # Non-interactive background backend
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter

from db.transactions import get_monthly_totals, get_daily_totals

def build_cashflow_chart(selected_type="expense", year=None, is_mobile=False):
    year = int(year) if year else datetime.date.today().year
    totals = {month: 0.0 for month in range(1, 13)}
    for period, kind, value in get_monthly_totals(year):
        try:
            row_year, row_month = map(int, period.split("-"))
            if kind == selected_type and row_year == year:
                totals[row_month] += float(value)
        except (ValueError, IndexError):
            continue

    color = "#D65B67" if selected_type == "expense" else "#159B72"
    
    # Adaptive figsize and DPI: wider ratio so it spans full card width
    fig_size = (6.5, 2.8) if is_mobile else (8.5, 3.0)
    dpi = 130 if is_mobile else 140

    fig, ax = plt.subplots(figsize=fig_size, dpi=dpi)
    fig.patch.set_facecolor("#FFFFFF")
    ax.set_facecolor("#FFFFFF")

    x_vals = range(1, 13)
    y_vals = [totals[m] for m in x_vals]

    bars = ax.bar(x_vals, y_vals, width=0.55, color=color, alpha=0.88, edgecolor="none", zorder=3)
    for bar in bars:
        bar.set_linewidth(0)

    month_labels = [calendar.month_abbr[m] for m in range(1, 13)]
    ax.set_xticks(list(x_vals))
    ax.set_xticklabels(month_labels, fontsize=7.5 if is_mobile else 8.5, color="#7A8494", fontweight="500")

    def currency_fmt(x, _):
        if x >= 10000000:
            return f"₹{x/10000000:.1f}Cr"
        if x >= 100000:
            return f"₹{x/100000:.1f}L"
        if x >= 1000:
            return f"₹{x/1000:.0f}K"
        return f"₹{x:.0f}"

    ax.yaxis.set_major_formatter(FuncFormatter(currency_fmt))
    ax.tick_params(axis="y", labelsize=7.5 if is_mobile else 8.5, colors="#7A8494", length=0)
    ax.tick_params(axis="x", length=0)
    ax.grid(axis="y", color="#EEF0F3", linewidth=0.8, linestyle="-", zorder=0)
    ax.set_axisbelow(True)

    for spine in ax.spines.values():
        spine.set_visible(False)

    ax.set_xlim(0.3, 12.7)
    max_y = max(y_vals) if y_vals and max(y_vals) > 0 else 100
    ax.set_ylim(0, max_y * 1.18)

    buffer = io.BytesIO()
    fig.savefig(buffer, format="png", bbox_inches="tight", pad_inches=0.04)
    plt.close(fig)

    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return ft.Image(
        src=f"data:image/png;base64,{encoded}",
        fit=ft.BoxFit.FIT_WIDTH,
        width=float("inf")
    )
