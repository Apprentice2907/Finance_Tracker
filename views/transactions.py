import datetime
import flet as ft

from db.transactions import get_transactions, delete_transaction, get_totals
from db.categories import get_categories
from utils.responsive import (
    BG, CARD, TEXT, MUTED, BORDER, BLUE, GREEN, RED,
    is_mobile, padding_box, card_border, soft_color, format_currency
)
from utils.period_helper import PERIOD_OPTIONS, get_period_dates
from views.dialogs import open_transaction_dialog, open_custom_date_dialog

def transactions_view(page: ft.Page):
    state = {
        "search": "",
        "type": "all",  # 'all', 'income', 'expense'
        "category_id": "all",
        "period_key": "all_time",
        "custom_start": None,
        "custom_end": None,
        "sort_by": "date_desc",  # 'date_desc', 'date_asc', 'amount_desc', 'amount_asc'
    }

    root = ft.Column(spacing=16, scroll=ft.ScrollMode.AUTO, expand=True)

    def make_card(content, padding=16):
        return ft.Container(
            content,
            padding=padding,
            bgcolor=CARD,
            border=card_border(),
            border_radius=12
        )

    def current_date_filter():
        if state["period_key"] == "all_time":
            return None, None
        return get_period_dates(state["period_key"], state["custom_start"], state["custom_end"])[:2]

    # Type Filter Buttons
    def type_filter_btn(label, val):
        is_active = (state["type"] == val)
        return ft.TextButton(
            label,
            on_click=lambda _: (state.update({"type": val}), refresh()),
            style=ft.ButtonStyle(
                color=TEXT if is_active else MUTED,
                bgcolor="#EAF1FF" if is_active else None,
                padding=padding_box(12, 6),
                shape=ft.RoundedRectangleBorder(radius=6)
            )
        )

    def refresh():
        start_d, end_d = current_date_filter()
        t_type = None if state["type"] == "all" else state["type"]
        cat_id = None if state["category_id"] == "all" else state["category_id"]
        
        rows = get_transactions(
            start_date=start_d,
            end_date=end_d,
            category_id=cat_id,
            transaction_type=t_type,
            search_query=state["search"],
            sort_by=state["sort_by"]
        )

        mobile = is_mobile(page)

        # Totals of current filtered subset
        tot_inc = sum(float(r[2]) for r in rows if r[1] == "income")
        tot_exp = sum(float(r[2]) for r in rows if r[1] == "expense")
        tot_net = tot_inc - tot_exp

        # Search Bar
        search_field = ft.TextField(
            hint_text="Search by name, category, note, or amount...",
            value=state["search"],
            prefix_icon=ft.Icons.SEARCH_ROUNDED,
            on_change=lambda e: (state.update({"search": e.control.value}), refresh()),
            border_color=BORDER,
            text_size=13,
            height=42,
            content_padding=10,
            expand=True
        )

        # Type segmented bar
        type_bar = ft.Container(
            ft.Row([
                type_filter_btn("All", "all"),
                type_filter_btn("Income", "income"),
                type_filter_btn("Expense", "expense"),
            ], tight=True, spacing=2),
            bgcolor="#F3F5F7",
            padding=3,
            border_radius=8
        )

        # Category Filter Dropdown
        all_cats = get_categories()
        cat_options = [ft.dropdown.Option("all", "All Categories")]
        cat_options.extend([ft.dropdown.Option(str(c[0]), f"{c[1]} ({c[2].title()})") for c in all_cats])
        cat_dropdown = ft.Dropdown(
            value=str(state["category_id"]),
            options=cat_options,
            on_select=lambda e: (state.update({"category_id": e.control.value}), refresh()),
            width=190 if not mobile else None,
            text_size=12,
            dense=True,
            border_color=BORDER,
            expand=True if mobile else False,
            content_padding=padding_box(12, 8)
        )

        # Period Filter Dropdown
        period_opts = [ft.dropdown.Option("all_time", "All Time")]
        period_opts.extend([ft.dropdown.Option(k, v) for k, v in PERIOD_OPTIONS])
        
        def on_period_change(e):
            val = e.control.value
            if val == "custom":
                s, ed = start_d or datetime.date.today().strftime("%Y-%m-%d"), end_d or datetime.date.today().strftime("%Y-%m-%d")
                open_custom_date_dialog(page, s, ed, apply_custom_range)
            else:
                state["period_key"] = val
                refresh()

        period_dropdown = ft.Dropdown(
            value=state["period_key"],
            options=period_opts,
            on_select=on_period_change,
            width=165 if not mobile else None,
            text_size=12,
            dense=True,
            border_color=BORDER,
            expand=True if mobile else False,
            content_padding=padding_box(12, 8)
        )

        # Sort Dropdown
        sort_dropdown = ft.Dropdown(
            value=state["sort_by"],
            options=[
                ft.dropdown.Option("date_desc", "Newest First"),
                ft.dropdown.Option("date_asc", "Oldest First"),
                ft.dropdown.Option("amount_desc", "Highest Amount"),
                ft.dropdown.Option("amount_asc", "Lowest Amount"),
            ],
            on_select=lambda e: (state.update({"sort_by": e.control.value}), refresh()),
            width=165 if not mobile else None,
            text_size=12,
            dense=True,
            border_color=BORDER,
            expand=True if mobile else False,
            content_padding=padding_box(12, 8)
        )

        # Add Button
        add_btn = ft.ElevatedButton(
            "Add Transaction",
            icon=ft.Icons.ADD_ROUNDED,
            on_click=lambda _: open_transaction_dialog(page, refresh),
            style=ft.ButtonStyle(
                bgcolor=BLUE,
                color="#FFFFFF",
                padding=padding_box(16, 10),
                shape=ft.RoundedRectangleBorder(radius=8)
            )
        )

        # Header Section
        header = ft.Row([
            ft.Column([
                ft.Text("Transactions", size=20 if mobile else 22, weight=ft.FontWeight.BOLD, color=TEXT),
                ft.Text(f"{len(rows)} record(s) found", color=MUTED, size=12),
            ], spacing=2),
            add_btn
        ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN)

        # Filter Controls Bar
        if mobile:
            filter_section = make_card(
                ft.Column([
                    search_field,
                    type_bar,
                    ft.Row([period_dropdown, cat_dropdown], spacing=8),
                    sort_dropdown,
                ], spacing=10)
            )
        else:
            filter_section = make_card(
                ft.Column([
                    ft.Row([search_field, type_bar], spacing=12),
                    ft.Row([period_dropdown, cat_dropdown, sort_dropdown], spacing=10)
                ], spacing=10)
            )

        # Summary Metrics Bar
        metrics_bar = ft.Container(
            ft.Row([
                ft.Row([ft.Text("Income:", size=12, color=MUTED), ft.Text(format_currency(tot_inc), size=12, color=GREEN, weight=ft.FontWeight.BOLD)], spacing=4),
                ft.Row([ft.Text("Expenses:", size=12, color=MUTED), ft.Text(format_currency(tot_exp), size=12, color=RED, weight=ft.FontWeight.BOLD)], spacing=4),
                ft.Row([ft.Text("Net:", size=12, color=MUTED), ft.Text(format_currency(tot_net), size=12, color=GREEN if tot_net >= 0 else RED, weight=ft.FontWeight.BOLD)], spacing=4),
            ], alignment=ft.MainAxisAlignment.SPACE_AROUND if mobile else ft.MainAxisAlignment.START, spacing=24),
            padding=padding_box(12, 8),
            bgcolor="#F4F6F9",
            border_radius=8
        )

        # Transaction Rows / Cards
        if not rows:
            items_container = make_card(
                ft.Column([
                    ft.Icon(ft.Icons.SEARCH_OFF_ROUNDED, size=36, color="#B3BBC7"),
                    ft.Text("No matching transactions", size=16, weight=ft.FontWeight.W_500, color=TEXT),
                    ft.Text("Try adjusting your filters or search query.", size=12, color=MUTED),
                ], horizontal_alignment=ft.CrossAxisAlignment.CENTER, spacing=6),
                padding=36
            )
        else:
            cards = []
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
                col = GREEN if is_inc else RED
                icon_name = ft.Icons.ARROW_DOWNWARD_ROUNDED if is_inc else ft.Icons.ARROW_UPWARD_ROUNDED

                display_title = t_name if t_name else (t_cat or "Uncategorised")
                subtitle_parts = []
                if t_name:
                    subtitle_parts.append(t_cat or "Uncategorised")
                subtitle_parts.append(t_date)
                if t_note:
                    subtitle_parts.append(t_note)
                subtitle_text = " · ".join(subtitle_parts)

                card = ft.Container(
                    ft.Row([
                        ft.Container(
                            ft.Icon(icon_name, size=16, color=col),
                            bgcolor=soft_color(col),
                            padding=8,
                            border_radius=8
                        ),
                        ft.Column([
                            ft.Row([
                                ft.Container(width=7, height=7, bgcolor=t_color, border_radius=4),
                                ft.Text(display_title, weight=ft.FontWeight.W_600, color=TEXT, size=13),
                            ], spacing=6),
                            ft.Text(subtitle_text, size=11, color=MUTED, max_lines=1, no_wrap=True),
                        ], spacing=2, expand=True),
                        ft.Text(
                            ("+ " if is_inc else "− ") + format_currency(t_amt),
                            color=col,
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
                cards.append(card)

            items_container = make_card(ft.Column(cards, spacing=0))

        root.controls = [
            header,
            filter_section,
            metrics_bar,
            items_container
        ]
        page.update()

    def apply_custom_range(s, ed):
        state["period_key"] = "custom"
        state["custom_start"] = s
        state["custom_end"] = ed
        refresh()

    refresh()

    pad_h = 16 if is_mobile(page) else 28
    pad_v = 16 if is_mobile(page) else 24
    return ft.Container(root, padding=padding_box(pad_h, pad_v), expand=True, bgcolor=BG)