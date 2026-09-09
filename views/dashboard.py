import datetime
import calendar
import flet as ft

from charts.cashflow_chart import build_cashflow_chart
from charts.category_pie import build_category_pie
from db.categories import CATEGORY_COLORS, get_categories
from db.transactions import (
    get_totals, get_category_totals, get_transactions,
    get_monthly_totals, delete_transaction
)
from utils.responsive import (
    BG, CARD, TEXT, MUTED, BORDER, BLUE, BLUE_LIGHT, GREEN, GREEN_LIGHT, RED, RED_LIGHT, AMBER,
    is_mobile, is_desktop, padding_box, card_border, soft_color,
    format_currency, format_percent_change
)
from utils.period_helper import (
    PERIOD_OPTIONS, get_period_dates, get_previous_period_dates
)
from utils.insights import generate_financial_insights
from views.dialogs import open_transaction_dialog, open_custom_date_dialog

def dashboard_view(page: ft.Page, on_navigate=None):
    # Reactive state
    state = {
        "period_key": "this_month",
        "custom_start": None,
        "custom_end": None,
        "chart_type": "expense",  # 'expense' or 'income'
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

    def period_dropdown():
        options = [ft.dropdown.Option(k, v) for k, v in PERIOD_OPTIONS]
        def on_change(e):
            val = e.control.value
            if val == "custom":
                s, e_date, _ = current_dates()
                open_custom_date_dialog(page, s, e_date, apply_custom_range)
            else:
                state["period_key"] = val
                refresh()

        return ft.Container(
            ft.Dropdown(
                value=state["period_key"],
                options=options,
                on_select=on_change,
                width=175 if not is_mobile(page) else 155,
                text_size=13,
                dense=True,
                border_color=BORDER,
                content_padding=padding_box(12, 8)
            ),
            bgcolor=CARD,
            border_radius=8
        )

    def apply_custom_range(start_d, end_d):
        state["period_key"] = "custom"
        state["custom_start"] = start_d
        state["custom_end"] = end_d
        refresh()

    def segmented_toggle(label, is_active, on_click):
        return ft.TextButton(
            label,
            on_click=on_click,
            style=ft.ButtonStyle(
                color=TEXT if is_active else MUTED,
                bgcolor="#EAF1FF" if is_active else None,
                padding=padding_box(12, 6),
                shape=ft.RoundedRectangleBorder(radius=7)
            )
        )

    def chart_toggle():
        return ft.Container(
            ft.Row([
                segmented_toggle("Expense", state["chart_type"] == "expense", lambda _: set_chart_type("expense")),
                segmented_toggle("Income", state["chart_type"] == "income", lambda _: set_chart_type("income")),
            ], tight=True, spacing=2),
            bgcolor="#F3F5F7",
            padding=3,
            border_radius=8
        )

    def set_chart_type(t):
        state["chart_type"] = t
        refresh()

    def summary_card(title, value, prev_value, color, icon, is_main=False):
        change_text, change_color, change_icon = format_percent_change(value, prev_value)
        return make_card(
            ft.Column([
                ft.Row([
                    ft.Text(title, size=13, color=MUTED, weight=ft.FontWeight.W_500),
                    ft.Container(ft.Icon(icon, color=color, size=16), bgcolor=soft_color(color), padding=6, border_radius=8)
                ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
                ft.Text(format_currency(value), size=22 if not is_main else 24, weight=ft.FontWeight.BOLD, color=TEXT),
                ft.Row([
                    ft.Icon(change_icon, size=14, color=change_color),
                    ft.Text(change_text, size=11, color=change_color, weight=ft.FontWeight.W_500),
                    ft.Text(previous_dates()[2], size=11, color=MUTED),
                ], spacing=4, vertical_alignment=ft.CrossAxisAlignment.CENTER)
            ], spacing=6),
            expand=1 if not is_mobile(page) else None
        )

    def top_categories_widget(start_date, end_date):
        rows = get_category_totals(state["chart_type"], start_date, end_date)
        if not rows:
            return ft.Container(
                ft.Text("No transactions in this period.", size=12, color=MUTED),
                padding=padding_box(top=8, bottom=8)
            )
        total = sum(float(val) for _, val, _, _ in rows)
        items = []
        for name, val, cat_color, _ in rows[:5]:
            pct = (float(val) / total) if total > 0 else 0
            items.append(
                ft.Container(
                    ft.Row([
                        ft.Row([
                            ft.Container(width=8, height=8, bgcolor=cat_color, border_radius=4),
                            ft.Text(name, size=12, color=TEXT, weight=ft.FontWeight.W_500),
                        ], spacing=8),
                        ft.Text(f"{format_currency(val)} · {pct:.0%}", size=12, color=MUTED),
                    ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
                    padding=padding_box(vertical=3)
                )
            )
        return ft.Column(items, spacing=6)

    def recent_transactions_list(start_date, end_date):
        rows = get_transactions(start_date, end_date, limit=6)
        if not rows:
            return ft.Container(
                ft.Column([
                    ft.Icon(ft.Icons.RECEIPT_LONG_OUTLINED, size=32, color="#B3BBC7"),
                    ft.Text("No transactions in this period", size=15, weight=ft.FontWeight.W_500, color=TEXT),
                    ft.Text("Tap '+ Add Transaction' to record new activity.", size=12, color=MUTED),
                ], horizontal_alignment=ft.CrossAxisAlignment.CENTER, spacing=6),
                padding=24,
                alignment=ft.Alignment(0, 0)
            )

        items = []
        for row in rows:
            t_id = row[0]
            t_type = row[1]
            t_amt = row[2]
            _ = row[3]
            t_cat = row[4]
            t_date = row[5]
            t_note = row[6]
            t_color = row[7]
            t_name = row[8] if len(row) > 8 else ""

            is_inc = (t_type == "income")
            icon_col = GREEN if is_inc else RED
            icon_name = ft.Icons.ARROW_DOWNWARD_ROUNDED if is_inc else ft.Icons.ARROW_UPWARD_ROUNDED

            display_title = t_name if t_name else (t_cat or "Uncategorised")
            subtitle_parts = []
            if t_name:
                subtitle_parts.append(t_cat or "Uncategorised")
            subtitle_parts.append(t_date)
            if t_note:
                subtitle_parts.append(t_note)
            subtitle_text = " · ".join(subtitle_parts)

            items.append(
                ft.Container(
                    ft.Row([
                        ft.Container(
                            ft.Icon(icon_name, size=16, color=icon_col),
                            bgcolor=soft_color(icon_col),
                            padding=8,
                            border_radius=8
                        ),
                        ft.Column([
                            ft.Row([
                                ft.Container(width=7, height=7, bgcolor=t_color, border_radius=4),
                                ft.Text(display_title, weight=ft.FontWeight.W_600, color=TEXT, size=13),
                            ], spacing=6),
                            ft.Text(subtitle_text, size=11, color=MUTED, no_wrap=True, max_lines=1),
                        ], spacing=2, expand=True),
                        ft.Text(
                            ("+ " if is_inc else "− ") + format_currency(t_amt),
                            color=icon_col,
                            weight=ft.FontWeight.BOLD,
                            size=13
                        ),
                        ft.IconButton(
                            ft.Icons.EDIT_OUTLINED,
                            icon_size=16,
                            icon_color=MUTED,
                            tooltip="Edit",
                            on_click=lambda _, r=row: open_transaction_dialog(page, refresh, r)
                        ),
                        ft.IconButton(
                            ft.Icons.DELETE_OUTLINE,
                            icon_size=16,
                            icon_color=RED,
                            tooltip="Delete",
                            on_click=lambda _, tid=t_id: (delete_transaction(tid), refresh())
                        )
                    ], vertical_alignment=ft.CrossAxisAlignment.CENTER),
                    padding=padding_box(vertical=8),
                    border=ft.Border(bottom=ft.BorderSide(1, "#F0F2F5"))
                )
            )
        return ft.Column(items, spacing=0)

    def monthly_overview_grid(year):
        cards = []
        for month in range(1, 13):
            key = f"{year}-{month:02d}"
            start_d, end_d = f"{key}-01", f"{key}-{calendar.monthrange(year, month)[1]:02d}"
            t = get_totals(start_d, end_d)
            inc = t.get("income", 0.0) or 0.0
            exp = t.get("expense", 0.0) or 0.0
            net = inc - exp
            is_cur_month = (key == datetime.date.today().strftime("%Y-%m"))
            cards.append(
                ft.Container(
                    ft.Column([
                        ft.Text(calendar.month_abbr[month], weight=ft.FontWeight.BOLD, color=TEXT, size=13),
                        ft.Text(f"In   {format_currency(inc)}", size=10, color=GREEN),
                        ft.Text(f"Out  {format_currency(exp)}", size=10, color=RED),
                        ft.Text(f"Net  {format_currency(net)}", size=10, color=GREEN if net >= 0 else RED, weight=ft.FontWeight.W_500),
                    ], spacing=4),
                    col={"sm": 6, "md": 3, "lg": 2},
                    padding=12,
                    bgcolor="#F0F4FD" if is_cur_month else "#F9FAFC",
                    border=card_border("#C9D8F8" if is_cur_month else BORDER),
                    border_radius=10,
                    ink=True,
                    on_click=lambda _, k=key: switch_to_month(k),
                    tooltip=f"View {calendar.month_name[month]} {year}"
                )
            )
        return ft.ResponsiveRow(cards, spacing=8, run_spacing=8)

    def switch_to_month(year_month_key):
        year, month = map(int, year_month_key.split("-"))
        last_day = calendar.monthrange(year, month)[1]
        state["period_key"] = "custom"
        state["custom_start"] = f"{year_month_key}-01"
        state["custom_end"] = f"{year_month_key}-{last_day:02d}"
        refresh()

    def refresh():
        start_d, end_d, human_label = current_dates()
        prev_s, prev_e, prev_label = previous_dates()

        cur_totals = get_totals(start_d, end_d)
        cur_inc = cur_totals.get("income", 0.0) or 0.0
        cur_exp = cur_totals.get("expense", 0.0) or 0.0
        cur_net = cur_inc - cur_exp

        prev_totals = get_totals(prev_s, prev_e)
        prev_inc = prev_totals.get("income", 0.0) or 0.0
        prev_exp = prev_totals.get("expense", 0.0) or 0.0
        prev_net = prev_inc - prev_exp

        mobile = is_mobile(page)

        # Header Row
        header_controls = [
            ft.Column([
                ft.Text("Dashboard", size=20 if mobile else 22, weight=ft.FontWeight.BOLD, color=TEXT),
                ft.Text(human_label, color=MUTED, size=12 if mobile else 13),
            ], spacing=2),
            period_dropdown(),
        ]
        header = ft.Row(header_controls, alignment=ft.MainAxisAlignment.SPACE_BETWEEN)

        # Summary Cards
        if mobile:
            summary_section = ft.Column([
                summary_card("Net Balance", cur_net, prev_net, GREEN if cur_net >= 0 else RED, ft.Icons.ACCOUNT_BALANCE_WALLET_OUTLINED, is_main=True),
                ft.Row([
                    summary_card("Income", cur_inc, prev_inc, GREEN, ft.Icons.SOUTH_WEST_ROUNDED),
                    summary_card("Expenses", cur_exp, prev_exp, RED, ft.Icons.NORTH_EAST_ROUNDED),
                ], spacing=10)
            ], spacing=10)
        else:
            summary_section = ft.Row([
                summary_card("Net Balance", cur_net, prev_net, GREEN if cur_net >= 0 else RED, ft.Icons.ACCOUNT_BALANCE_WALLET_OUTLINED, is_main=True),
                summary_card("Total Income", cur_inc, prev_inc, GREEN, ft.Icons.SOUTH_WEST_ROUNDED),
                summary_card("Total Expenses", cur_exp, prev_exp, RED, ft.Icons.NORTH_EAST_ROUNDED),
            ], spacing=14)

        # Charts Section
        cashflow_widget = make_card(
            ft.Column([
                ft.Row([
                    ft.Column([
                        ft.Text("Cashflow Activity", size=15, weight=ft.FontWeight.BOLD, color=TEXT),
                        ft.Text(f"{state['selected_year']} monthly breakdown", size=11, color=MUTED),
                    ], spacing=1),
                    chart_toggle()
                ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
                ft.Container(
                    build_cashflow_chart(state["chart_type"], state["selected_year"], is_mobile=mobile),
                    height=200 if mobile else 240,
                    padding=padding_box(top=6)
                )
            ], spacing=6),
            expand=2 if not mobile else None
        )

        category_widget = make_card(
            ft.Column([
                ft.Text("Category Breakdown", size=15, weight=ft.FontWeight.BOLD, color=TEXT),
                ft.Text(f"{state['chart_type'].title()}s in period", size=11, color=MUTED),
                ft.Container(
                    build_category_pie(state["chart_type"], start_d, end_d, is_mobile=mobile),
                    alignment=ft.Alignment(0, 0)
                ),
                top_categories_widget(start_d, end_d)
            ], spacing=8),
            expand=1 if not mobile else None
        )

        if mobile:
            analytics_section = ft.Column([cashflow_widget, category_widget], spacing=12)
        else:
            analytics_section = ft.ResponsiveRow([
                ft.Container(cashflow_widget, col={"sm": 12, "md": 7, "lg": 8}),
                ft.Container(category_widget, col={"sm": 12, "md": 5, "lg": 4})
            ], spacing=14, run_spacing=14)

        # Recent Transactions
        transactions_card = make_card(
            ft.Column([
                ft.Row([
                    ft.Column([
                        ft.Text("Recent Transactions", size=15, weight=ft.FontWeight.BOLD, color=TEXT),
                        ft.Text(f"Latest records ({human_label})", size=11, color=MUTED),
                    ], spacing=1),
                    ft.ElevatedButton(
                        "Add",
                        icon=ft.Icons.ADD_ROUNDED,
                        on_click=lambda _: open_transaction_dialog(page, refresh),
                        style=ft.ButtonStyle(
                            bgcolor=BLUE,
                            color="#FFFFFF",
                            padding=padding_box(14, 8),
                            shape=ft.RoundedRectangleBorder(radius=8)
                        )
                    )
                ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
                recent_transactions_list(start_d, end_d)
            ], spacing=10)
        )

        # Insights Section
        insights_data = generate_financial_insights()
        insights_cards = []
        for item in insights_data[:3]:
            insights_cards.append(
                ft.Container(
                    ft.Row([
                        ft.Icon(
                            ft.Icons.TRENDING_UP if item["type"] == "warning" else (ft.Icons.SAVINGS_OUTLINED if item["type"] == "positive" else ft.Icons.LIGHTBULB_OUTLINE),
                            color=item["accent_color"],
                            size=18
                        ),
                        ft.Column([
                            ft.Text(item["title"], size=12, weight=ft.FontWeight.BOLD, color=TEXT),
                            ft.Text(item["message"], size=11, color=MUTED),
                        ], spacing=1, expand=True)
                    ], spacing=10, vertical_alignment=ft.CrossAxisAlignment.CENTER),
                    bgcolor="#F8FAFD",
                    border=card_border("#E2E8F0"),
                    border_radius=8,
                    padding=10,
                    col={"sm": 12, "md": 6, "lg": 4}
                )
            )

        insights_widget = None
        if insights_cards:
            insights_widget = make_card(
                ft.Column([
                    ft.Text("Personal Financial Insights", size=14, weight=ft.FontWeight.BOLD, color=TEXT),
                    ft.ResponsiveRow(insights_cards, spacing=8, run_spacing=8)
                ], spacing=8),
                padding=12
            )

        # Content assembly
        content_items = [
            header,
            summary_section,
        ]
        if insights_widget:
            content_items.append(insights_widget)
        content_items.extend([
            analytics_section,
            transactions_card,
        ])

        if not mobile:
            yearly_matrix = make_card(
                ft.Column([
                    ft.Row([
                        ft.Column([
                            ft.Text(f"{state['selected_year']} Monthly Performance", size=16, weight=ft.FontWeight.BOLD, color=TEXT),
                            ft.Text("Click on any month to filter dashboard to that period.", size=12, color=MUTED),
                        ], spacing=2),
                        ft.Dropdown(
                            value=str(state["selected_year"]),
                            options=[ft.dropdown.Option(str(y), str(y)) for y in range(datetime.date.today().year, datetime.date.today().year - 5, -1)],
                            width=110,
                            text_size=12,
                            dense=True,
                            border_color=BORDER,
                            content_padding=padding_box(10, 6),
                            on_select=lambda e: (state.update({"selected_year": int(e.control.value)}), refresh())
                        )
                    ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
                    monthly_overview_grid(state["selected_year"])
                ], spacing=12)
            )
            content_items.append(yearly_matrix)

        root.controls = content_items
        page.update()

    refresh()
    
    pad_h = 16 if is_mobile(page) else 28
    pad_v = 16 if is_mobile(page) else 24
    return ft.Container(root, padding=padding_box(pad_h, pad_v), expand=True, bgcolor=BG)
