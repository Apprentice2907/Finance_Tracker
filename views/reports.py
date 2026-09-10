import datetime
import calendar
import flet as ft

from db.transactions import get_totals, get_category_totals, get_monthly_totals
from charts.cashflow_chart import build_cashflow_chart
from charts.category_pie import build_category_pie
from utils.responsive import (
    BG, CARD, TEXT, MUTED, BORDER, BLUE, GREEN, RED, AMBER,
    is_mobile, padding_box, card_border, soft_color, format_currency, format_percent_change
)
from utils.period_helper import (
    PERIOD_OPTIONS, get_period_dates, get_previous_period_dates
)
from views.dialogs import open_custom_date_dialog

def reports_view(page: ft.Page):
    state = {
        "period_key": "this_month",
        "custom_start": None,
        "custom_end": None,
        "selected_year": datetime.date.today().year,
    }

    root = ft.Column(spacing=18, scroll=ft.ScrollMode.AUTO, expand=True)

    def make_card(content, expand=None, padding=18):
        return ft.Container(
            content,
            padding=padding,
            bgcolor=CARD,
            border=card_border(),
            border_radius=14,
            expand=expand
        )

    def current_dates():
        return get_period_dates(state["period_key"], state["custom_start"], state["custom_end"])

    def previous_dates():
        s, e, _ = current_dates()
        return get_previous_period_dates(state["period_key"], s, e)

    def period_dropdown(full_width=False):
        options = [ft.dropdown.Option(k, v) for k, v in PERIOD_OPTIONS]
        mob = is_mobile(page)
        def on_change(e):
            val = e.control.value
            if val == "custom":
                s, e_date, _ = current_dates()
                open_custom_date_dialog(page, s, e_date, apply_custom_range)
            else:
                state["period_key"] = val
                refresh()

        return ft.Dropdown(
            value=state["period_key"],
            options=options,
            on_select=on_change,
            width=None if full_width else (135 if mob else 170),
            text_size=12 if mob else 13,
            dense=True,
            border_color=BORDER,
            border_radius=8,
            expand=True if full_width else False,
            content_padding=padding_box(10, 6) if mob else padding_box(12, 8)
        )

    def apply_custom_range(start_d, end_d):
        state["period_key"] = "custom"
        state["custom_start"] = start_d
        state["custom_end"] = end_d
        refresh()

    def metric_card(title, value, prev_value, color, icon, is_currency=True, subtitle=None):
        change_text, change_color, change_icon = format_percent_change(value, prev_value) if is_currency else ("", MUTED, ft.Icons.REMOVE)
        display_val = format_currency(value) if is_currency else f"{value:.1f}%"
        mob = is_mobile(page)

        if is_currency:
            if change_text == "No prior data":
                sub_row = ft.Row([
                    ft.Icon(ft.Icons.REMOVE_ROUNDED, size=11, color=MUTED),
                    ft.Text("No prior data", size=10 if mob else 11, color=MUTED, weight=ft.FontWeight.W_500, no_wrap=True)
                ], spacing=2, vertical_alignment=ft.CrossAxisAlignment.CENTER)
            else:
                sub_row = ft.Row([
                    ft.Icon(change_icon, size=11 if mob else 13, color=change_color),
                    ft.Text(change_text, size=10 if mob else 11, color=change_color, weight=ft.FontWeight.W_500, no_wrap=True)
                ], spacing=2, vertical_alignment=ft.CrossAxisAlignment.CENTER)
        else:
            sub_row = ft.Row([
                ft.Text(subtitle or "", size=10 if mob else 11, color=MUTED, weight=ft.FontWeight.W_500, no_wrap=True)
            ], vertical_alignment=ft.CrossAxisAlignment.CENTER)

        return make_card(
            ft.Column([
                ft.Row([
                    ft.Text(title, size=11 if mob else 12, color=MUTED, weight=ft.FontWeight.W_500, no_wrap=True, overflow=ft.TextOverflow.ELLIPSIS),
                    ft.Container(
                        ft.Icon(icon, color=color, size=13 if mob else 15),
                        bgcolor=soft_color(color),
                        padding=4 if mob else 6,
                        border_radius=7
                    )
                ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN, vertical_alignment=ft.CrossAxisAlignment.CENTER),
                ft.Text(display_val, size=17 if mob else 20, weight=ft.FontWeight.BOLD, color=TEXT, no_wrap=True),
                sub_row
            ], spacing=4),
            padding=padding_box(12, 10) if mob else 18,
            expand=1
        )

    def category_breakdown_list(t_type, start_d, end_d):
        rows = get_category_totals(t_type, start_d, end_d)
        if not rows:
            return ft.Container(
                ft.Text(f"No {t_type} activity in this period.", size=12, color=MUTED),
                padding=padding_box(top=10, bottom=10)
            )
        total = sum(float(v) for _, v, _, _ in rows)
        cards = []
        for name, val, cat_color, count in rows:
            ratio = (float(val) / total) if total > 0 else 0
            cards.append(
                ft.Container(
                    ft.Column([
                        ft.Row([
                            ft.Row([
                                ft.Container(width=8, height=8, bgcolor=cat_color, border_radius=4),
                                ft.Text(name, size=13, color=TEXT, weight=ft.FontWeight.W_500, no_wrap=True, overflow=ft.TextOverflow.ELLIPSIS, max_lines=1),
                                ft.Text(f"({count} txns)", size=11, color=MUTED, no_wrap=True),
                            ], spacing=6, expand=True),
                            ft.Text(f"{format_currency(val)} ({ratio:.1%})", size=12, color=TEXT, weight=ft.FontWeight.BOLD, no_wrap=True),
                        ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
                        ft.ProgressBar(value=ratio, color=cat_color, bgcolor="#EEF1F6", height=5, border_radius=3)
                    ], spacing=6),
                    padding=padding_box(vertical=4)
                )
            )
        return ft.Column(cards, spacing=8)

    def refresh():
        start_d, end_d, human_label = current_dates()
        prev_s, prev_e, prev_label = previous_dates()

        cur_t = get_totals(start_d, end_d)
        inc = cur_t.get("income", 0.0) or 0.0
        exp = cur_t.get("expense", 0.0) or 0.0
        net = inc - exp
        savings_rate = (net / inc * 100.0) if inc > 0 else (0.0 if net >= 0 else -100.0)

        prev_t = get_totals(prev_s, prev_e)
        p_inc = prev_t.get("income", 0.0) or 0.0
        p_exp = prev_t.get("expense", 0.0) or 0.0
        p_net = p_inc - p_exp

        mobile = is_mobile(page)

        # Header
        from utils.responsive import get_page_width
        w = get_page_width(page)
        if mobile and w < 420:
            header = ft.Column([
                ft.Column([
                    ft.Text("Financial Reports", size=20, weight=ft.FontWeight.BOLD, color=TEXT),
                    ft.Text(f"Analytical overview · {human_label}", color=MUTED, size=12),
                ], spacing=2),
                period_dropdown(full_width=True)
            ], spacing=8)
        else:
            header = ft.Row([
                ft.Column([
                    ft.Text("Financial Reports", size=20 if mobile else 22, weight=ft.FontWeight.BOLD, color=TEXT),
                    ft.Text(f"Analytical overview · {human_label}", color=MUTED, size=12),
                ], spacing=2),
                period_dropdown(full_width=False)
            ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN, vertical_alignment=ft.CrossAxisAlignment.CENTER)

        # Metrics grid
        if mobile:
            if w < 360:
                metrics_grid = ft.Column([
                    metric_card("Total Income", inc, p_inc, GREEN, ft.Icons.SOUTH_WEST_ROUNDED),
                    metric_card("Total Expenses", exp, p_exp, RED, ft.Icons.NORTH_EAST_ROUNDED),
                    metric_card("Net Savings", net, p_net, GREEN if net >= 0 else RED, ft.Icons.ACCOUNT_BALANCE_WALLET_OUTLINED),
                    metric_card("Savings Rate", max(-100.0, min(100.0, savings_rate)), 0, BLUE, ft.Icons.PIE_CHART_OUTLINE, is_currency=False, subtitle="of total income"),
                ], spacing=8)
            else:
                metrics_grid = ft.Column([
                    ft.Row([
                        metric_card("Total Income", inc, p_inc, GREEN, ft.Icons.SOUTH_WEST_ROUNDED),
                        metric_card("Total Expenses", exp, p_exp, RED, ft.Icons.NORTH_EAST_ROUNDED),
                    ], spacing=10),
                    ft.Row([
                        metric_card("Net Savings", net, p_net, GREEN if net >= 0 else RED, ft.Icons.ACCOUNT_BALANCE_WALLET_OUTLINED),
                        metric_card("Savings Rate", max(-100.0, min(100.0, savings_rate)), 0, BLUE, ft.Icons.PIE_CHART_OUTLINE, is_currency=False, subtitle="of total income"),
                    ], spacing=10)
                ], spacing=10)
        else:
            metrics_grid = ft.Row([
                metric_card("Total Income", inc, p_inc, GREEN, ft.Icons.SOUTH_WEST_ROUNDED),
                metric_card("Total Expenses", exp, p_exp, RED, ft.Icons.NORTH_EAST_ROUNDED),
                metric_card("Net Savings", net, p_net, GREEN if net >= 0 else RED, ft.Icons.ACCOUNT_BALANCE_WALLET_OUTLINED),
                metric_card("Savings Rate", max(-100.0, min(100.0, savings_rate)), 0, BLUE, ft.Icons.PIE_CHART_OUTLINE, is_currency=False, subtitle="of total income"),
            ], spacing=14)

        # Charts Section
        donut_expense = make_card(
            ft.Column([
                ft.Text("Expense Breakdown", size=15, weight=ft.FontWeight.BOLD, color=TEXT),
                ft.Text(human_label, size=11, color=MUTED),
                ft.Container(build_category_pie("expense", start_d, end_d, is_mobile=mobile), alignment=ft.Alignment(0, 0)),
                category_breakdown_list("expense", start_d, end_d)
            ], spacing=10),
            expand=1 if not mobile else None
        )

        donut_income = make_card(
            ft.Column([
                ft.Text("Income Sources", size=15, weight=ft.FontWeight.BOLD, color=TEXT),
                ft.Text(human_label, size=11, color=MUTED),
                ft.Container(build_category_pie("income", start_d, end_d, is_mobile=mobile), alignment=ft.Alignment(0, 0)),
                category_breakdown_list("income", start_d, end_d)
            ], spacing=10),
            expand=1 if not mobile else None
        )

        if mobile:
            breakdown_section = ft.Column([donut_expense, donut_income], spacing=12)
        else:
            breakdown_section = ft.Row([donut_expense, donut_income], spacing=14, vertical_alignment=ft.CrossAxisAlignment.START)

        # Cashflow Trend Chart
        trend_card = make_card(
            ft.Column([
                ft.Text("Annual Cashflow Comparison", size=15, weight=ft.FontWeight.BOLD, color=TEXT),
                ft.Text(f"Year {state['selected_year']} monthly trends", size=11, color=MUTED),
                ft.Container(
                    build_cashflow_chart("expense", state["selected_year"], is_mobile=mobile),
                    height=200 if mobile else 250,
                    padding=padding_box(top=6)
                )
            ], spacing=6)
        )

        root.controls = [
            header,
            metrics_grid,
            breakdown_section,
            trend_card,
        ]
        page.update()

    refresh()

    pad_h = 12 if is_mobile(page) else 28
    pad_v = 14 if is_mobile(page) else 24
    return ft.Container(root, padding=padding_box(pad_h, pad_v), expand=True, bgcolor=BG)
