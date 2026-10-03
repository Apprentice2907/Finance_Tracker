import flet as ft
from flet_charts import PieChart, PieChartSection

from db.categories import CATEGORY_COLORS, get_categories
from db.transactions import get_category_totals

# Expose native chart classes on ft namespace for convenience
ft.PieChart = PieChart
ft.PieChartSection = PieChartSection

def _format_currency_compact(val: float) -> str:
    if val >= 10000000:
        return f"₹{val/10000000:.1f}Cr"
    if val >= 100000:
        return f"₹{val/100000:.1f}L"
    if val >= 1000:
        return f"₹{val/1000:.1f}K"
    return f"₹{val:,.0f}"

def build_category_pie(selected_type="expense", start_date=None, end_date=None, is_mobile=False, show_legend=False):
    rows = get_category_totals(selected_type, start_date, end_date)
    # Filter to only entries with strictly positive amounts (> 0)
    valid_rows = [r for r in rows if r[1] is not None and float(r[1]) > 0] if rows else []

    empty_container = ft.Container(
        ft.Column([
            ft.Icon(ft.Icons.PIE_CHART_OUTLINE, color="#B3BBC7", size=28),
            ft.Text("No category data", color="#7A8494", size=12),
        ], alignment=ft.MainAxisAlignment.CENTER, horizontal_alignment=ft.CrossAxisAlignment.CENTER, spacing=4),
        alignment=ft.Alignment(0, 0),
        height=160 if is_mobile else 180,
        expand=True
    )

    if not valid_rows or sum(float(r[1]) for r in valid_rows) <= 0:
        return empty_container

    categories = get_categories()
    color_by_name = {
        name: color or CATEGORY_COLORS[i % len(CATEGORY_COLORS)]
        for i, (_, name, _, color) in enumerate(categories)
    }

    values = [float(value) for _, value, _, _ in valid_rows]
    names = [name for name, _, _, _ in valid_rows]
    colors = [color_by_name.get(name, CATEGORY_COLORS[i % len(CATEGORY_COLORS)]) for i, name in enumerate(names)]
    total = sum(values)

    if total <= 0:
        return empty_container

    chart_height = 150 if is_mobile else 180
    radius = 22 if is_mobile else 28
    center_radius = 32 if is_mobile else 38

    sections = []
    for val, col in zip(values, colors):
        pct = (val / total * 100) if total > 0 else 0
        pct_label = f"{pct:.0f}%" if pct >= 8 else ""
        sections.append(
            PieChartSection(
                value=val,
                color=col,
                radius=radius,
                title=pct_label,
                title_style=ft.TextStyle(size=8 if is_mobile else 9, color="#FFFFFF", weight=ft.FontWeight.BOLD),
            )
        )

    pie = PieChart(
        sections=sections,
        sections_space=2,
        center_space_radius=center_radius,
        expand=True
    )

    total_str = _format_currency_compact(total)

    center_label = ft.Container(
        content=ft.Column([
            ft.Text(total_str, size=11 if is_mobile else 12, weight=ft.FontWeight.BOLD, color="#18212F"),
            ft.Text(selected_type.title(), size=8 if is_mobile else 9, color="#7A8494"),
        ], alignment=ft.MainAxisAlignment.CENTER, horizontal_alignment=ft.CrossAxisAlignment.CENTER, spacing=1),
        alignment=ft.Alignment(0, 0),
    )

    chart_widget = ft.Container(
        content=ft.Stack([
            pie,
            center_label,
        ], alignment=ft.Alignment(0, 0)),
        height=chart_height,
        alignment=ft.Alignment(0, 0)
    )

    if not show_legend:
        return chart_widget

    legend_items = []
    for name, val, col in zip(names, values, colors):
        pct = (val / total * 100) if total > 0 else 0
        legend_items.append(
            ft.Container(
                ft.Row([
                    ft.Row([
                        ft.Container(width=8, height=8, bgcolor=col, border_radius=4),
                        ft.Text(name, size=12, color="#18212F", weight=ft.FontWeight.W_500, no_wrap=True, overflow=ft.TextOverflow.ELLIPSIS),
                    ], spacing=8, expand=True),
                    ft.Text(f"{_format_currency_compact(val)} · {pct:.1f}%", size=12, color="#7A8494", no_wrap=True),
                ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
                padding=ft.Padding(0, 2, 0, 2)
            )
        )

    return ft.Column([
        chart_widget,
        ft.Column(legend_items, spacing=4)
    ], spacing=8)
