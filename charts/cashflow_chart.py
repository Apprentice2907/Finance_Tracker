import calendar
import datetime
import flet as ft
from flet_charts import (
    BarChart, BarChartGroup, BarChartRod,
    ChartAxis, ChartAxisLabel, ChartGridLines
)
from db.transactions import get_monthly_totals

# Expose native chart classes on ft namespace for convenience
ft.BarChart = BarChart
ft.BarChartGroup = BarChartGroup
ft.BarChartRod = BarChartRod
ft.ChartAxis = ChartAxis
ft.ChartAxisLabel = ChartAxisLabel
ft.ChartGridLines = ChartGridLines

def _format_currency_axis(val: float) -> str:
    if val >= 10000000:
        return f"₹{val/10000000:.1f}Cr"
    if val >= 100000:
        return f"₹{val/100000:.1f}L"
    if val >= 1000:
        return f"₹{val/1000:.0f}K"
    return f"₹{val:.0f}"

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
    max_val = max(totals.values()) if totals else 0.0
    max_y = max(max_val * 1.15, 100.0)

    rod_width = 8 if is_mobile else 14
    groups = [
        BarChartGroup(
            x=m,
            rods=[
                BarChartRod(
                    from_y=0,
                    to_y=totals[m],
                    width=rod_width,
                    color=color,
                    border_radius=ft.BorderRadius(3, 3, 0, 0),
                    tooltip=f"{calendar.month_abbr[m]}: ₹{totals[m]:,.0f}"
                )
            ]
        )
        for m in range(1, 13)
    ]

    bottom_labels = [
        ChartAxisLabel(
            value=m,
            label=ft.Text(calendar.month_abbr[m], size=7.5 if is_mobile else 8.5, color="#7A8494", weight=ft.FontWeight.W_500)
        )
        for m in range(1, 13)
    ]

    left_labels = [
        ChartAxisLabel(
            value=v,
            label=ft.Text(_format_currency_axis(v), size=7.5 if is_mobile else 8.5, color="#7A8494")
        )
        for v in [0, round(max_y / 2), round(max_y)]
    ]

    return BarChart(
        groups=groups,
        bottom_axis=ChartAxis(labels=bottom_labels, show_labels=True, label_size=18),
        left_axis=ChartAxis(labels=left_labels, show_labels=True, label_size=36),
        horizontal_grid_lines=ChartGridLines(color="#EEF0F3", width=0.8),
        min_y=0,
        max_y=max_y,
        interactive=True,
        expand=True
    )
