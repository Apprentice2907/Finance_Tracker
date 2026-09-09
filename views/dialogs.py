import datetime
import calendar
import flet as ft

from db.categories import get_categories
from db.transactions import add_transaction, update_transaction
from utils.responsive import (
    BLUE, CARD, TEXT, MUTED, BORDER, GREEN, RED,
    is_mobile, padding_box, card_border
)

def parse_picker_date(val, raw_data=None) -> str:
    """
    Robustly parses Flet DatePicker output into local YYYY-MM-DD string,
    correcting for UTC-to-local timezone shift (e.g. UTC+5:30 displaying previous day).
    """
    if not val and not raw_data:
        return datetime.date.today().strftime("%Y-%m-%d")

    # 1. Try parsing from raw event data if it is an ISO string with timezone
    if raw_data and isinstance(raw_data, str) and ("T" in raw_data or "Z" in raw_data):
        try:
            iso_str = raw_data.strip().replace("Z", "+00:00").strip('"\'')
            dt = datetime.datetime.fromisoformat(iso_str)
            if dt.tzinfo is not None:
                return dt.astimezone().strftime("%Y-%m-%d")
            else:
                return dt.replace(tzinfo=datetime.timezone.utc).astimezone().strftime("%Y-%m-%d")
        except Exception:
            pass

    # 2. If val is a datetime object
    if isinstance(val, (datetime.datetime, datetime.date)):
        if isinstance(val, datetime.datetime):
            if val.tzinfo is not None:
                return val.astimezone().strftime("%Y-%m-%d")
            else:
                if val.hour != 0 or val.minute != 0:
                    return val.replace(tzinfo=datetime.timezone.utc).astimezone().strftime("%Y-%m-%d")
                else:
                    return val.strftime("%Y-%m-%d")
        return val.strftime("%Y-%m-%d")

    # 3. If val is a string
    if isinstance(val, str) and val.strip():
        val_str = val.strip().strip('"\'')
        try:
            if "T" in val_str or "Z" in val_str:
                iso_str = val_str.replace("Z", "+00:00")
                dt = datetime.datetime.fromisoformat(iso_str)
                if dt.tzinfo is not None:
                    return dt.astimezone().strftime("%Y-%m-%d")
                else:
                    return dt.replace(tzinfo=datetime.timezone.utc).astimezone().strftime("%Y-%m-%d")
            return val_str[:10]
        except Exception:
            return val_str[:10]

    return datetime.date.today().strftime("%Y-%m-%d")

def open_transaction_dialog(page: ft.Page, on_success_callback=None, transaction=None):
    editing_id = transaction[0] if transaction else None
    t_type = transaction[1] if transaction else "expense"
    initial_cat_id = transaction[3] if transaction else None
    initial_amount = str(transaction[2]) if transaction else ""
    initial_date = transaction[5] if transaction else datetime.date.today().strftime("%Y-%m-%d")
    initial_note = transaction[6] if (transaction and len(transaction) > 6 and transaction[6]) else ""
    initial_name = transaction[8] if (transaction and len(transaction) > 8 and transaction[8]) else ""

    state = {
        "type": t_type,
        "selected_date": initial_date,
        "selected_cat": str(initial_cat_id) if initial_cat_id else None
    }

    mobile = is_mobile(page)

    name_input = ft.TextField(
        label="Name / Title",
        hint_text="e.g. Coffee, Apple, Parul University, Redbus...",
        value=initial_name,
        autofocus=True if not transaction else False,
        border_color=BORDER,
        text_size=14,
        content_padding=12
    )

    amount_input = ft.TextField(
        label="Amount (₹)",
        hint_text="0.00",
        keyboard_type=ft.KeyboardType.NUMBER,
        value=initial_amount,
        autofocus=True if transaction else False,
        border_color=BORDER,
        text_size=15,
        content_padding=12
    )

    date_display = ft.TextField(
        label="Date (YYYY-MM-DD)",
        value=state["selected_date"],
        read_only=True,
        expand=True,
        border_color=BORDER,
        text_size=14,
        content_padding=12
    )

    category_slot = ft.Column(spacing=0)
    note_input = ft.TextField(
        label="Note (Optional)",
        hint_text="e.g. Lunch with team, receipt #123...",
        multiline=True,
        min_lines=1,
        max_lines=3,
        value=initial_note,
        border_color=BORDER,
        text_size=14,
        content_padding=12
    )

    error_text = ft.Text("", color=RED, size=12)

    def load_categories():
        cats = get_categories(state["type"])
        options = [ft.dropdown.Option(str(c[0]), c[1]) for c in cats]
        val = state["selected_cat"] if any(str(c[0]) == state["selected_cat"] for c in cats) else (str(cats[0][0]) if cats else None)
        state["selected_cat"] = val
        category_slot.controls = [
            ft.Dropdown(
                label="Category",
                hint_text="Select a category",
                value=val,
                options=options,
                border_color=BORDER,
                text_size=14,
                dense=True,
                content_padding=padding_box(12, 10),
                on_select=lambda e: state.update({"selected_cat": e.control.value})
            )
        ]

    # Type switcher buttons
    def segmented_btn(label, is_active, on_click):
        color = GREEN if label == "Income" else RED
        return ft.TextButton(
            label,
            on_click=on_click,
            style=ft.ButtonStyle(
                color=TEXT if is_active else MUTED,
                bgcolor="#EAF1FF" if is_active else None,
                padding=padding_box(16, 8),
                shape=ft.RoundedRectangleBorder(radius=8)
            )
        )

    toggle_container = ft.Container()

    def update_type_toggle():
        toggle_container.content = ft.Container(
            ft.Row([
                segmented_btn("Expense", state["type"] == "expense", lambda _: set_type("expense")),
                segmented_btn("Income", state["type"] == "income", lambda _: set_type("income")),
            ], tight=True, spacing=4, alignment=ft.MainAxisAlignment.CENTER),
            bgcolor="#F3F5F7",
            padding=3,
            border_radius=10,
            alignment=ft.Alignment(0, 0)
        )

    def set_type(new_type):
        state["type"] = new_type
        load_categories()
        update_type_toggle()
        page.update()

    load_categories()
    update_type_toggle()

    # Date Picker
    def handle_date_picked(e):
        picked = parse_picker_date(e.control.value, getattr(e, "data", None))
        if picked:
            state["selected_date"] = picked
            date_display.value = state["selected_date"]
            page.update()

    date_picker = ft.DatePicker(
        first_date=datetime.datetime(2000, 1, 1),
        last_date=datetime.datetime(2100, 12, 31),
        on_change=handle_date_picked
    )
    page.overlay.append(date_picker)

    def open_date_picker(_):
        try:
            date_picker.value = datetime.datetime.strptime(date_display.value, "%Y-%m-%d")
        except ValueError:
            date_picker.value = datetime.datetime.now()
        date_picker.open = True
        page.update()

    date_row = ft.Row([
        date_display,
        ft.IconButton(
            icon=ft.Icons.CALENDAR_MONTH_OUTLINED,
            icon_color=BLUE,
            tooltip="Pick Date",
            on_click=open_date_picker
        )
    ], spacing=6, vertical_alignment=ft.CrossAxisAlignment.CENTER)

    def close_dialog():
        if date_picker in page.overlay:
            page.overlay.remove(date_picker)
        page.pop_dialog()

    def handle_save(_):
        amt_str = amount_input.value.strip() if amount_input.value else ""
        if not amt_str:
            error_text.value = "Please enter an amount."
            page.update()
            return
        
        try:
            amt_val = float(amt_str)
            if amt_val <= 0:
                raise ValueError
        except ValueError:
            error_text.value = "Enter a valid positive number."
            page.update()
            return

        cat_id = state["selected_cat"]
        if not cat_id:
            error_text.value = "Please select or create a category."
            page.update()
            return

        name_val = name_input.value.strip() if name_input.value else ""
        note_val = note_input.value.strip() if note_input.value else ""

        try:
            if editing_id:
                update_transaction(editing_id, state["type"], amt_val, int(cat_id), state["selected_date"], note_val, name=name_val)
            else:
                add_transaction(state["type"], amt_val, int(cat_id), state["selected_date"], note_val, name=name_val)
        except Exception as ex:
            error_text.value = f"Failed to save: {str(ex)}"
            page.update()
            return

        close_dialog()
        if on_success_callback:
            on_success_callback()

    content_box = ft.Container(
        ft.Column([
            toggle_container,
            name_input,
            amount_input,
            category_slot,
            date_row,
            note_input,
            error_text
        ], spacing=12, tight=True, scroll=ft.ScrollMode.AUTO),
        width=380 if not mobile else None,
        padding=padding_box(4, 4)
    )

    action_label = "Update Transaction" if editing_id else "Add Transaction"
    dialog = ft.AlertDialog(
        modal=True,
        bgcolor=CARD,
        title=ft.Text(action_label, weight=ft.FontWeight.BOLD, size=18, color=TEXT),
        content=content_box,
        actions=[
            ft.TextButton("Cancel", on_click=lambda _: close_dialog(), style=ft.ButtonStyle(color=MUTED)),
            ft.ElevatedButton(action_label, on_click=handle_save, style=ft.ButtonStyle(bgcolor=BLUE, color="#FFFFFF", shape=ft.RoundedRectangleBorder(radius=8))),
        ],
        actions_alignment=ft.MainAxisAlignment.END
    )

    page.show_dialog(dialog)


def open_custom_date_dialog(page: ft.Page, current_start: str, current_end: str, on_apply_callback):
    start_state = {"val": current_start}
    end_state = {"val": current_end}

    start_input = ft.TextField(label="Start Date", value=start_state["val"], read_only=True, expand=True, border_color=BORDER)
    end_input = ft.TextField(label="End Date", value=end_state["val"], read_only=True, expand=True, border_color=BORDER)
    err = ft.Text("", color=RED, size=12)

    def pick_start(e):
        picked = parse_picker_date(e.control.value, getattr(e, "data", None))
        if picked:
            start_state["val"] = picked
            start_input.value = start_state["val"]
            page.update()

    def pick_end(e):
        picked = parse_picker_date(e.control.value, getattr(e, "data", None))
        if picked:
            end_state["val"] = picked
            end_input.value = end_state["val"]
            page.update()

    start_picker = ft.DatePicker(first_date=datetime.datetime(2000, 1, 1), last_date=datetime.datetime(2100, 12, 31), on_change=pick_start)
    end_picker = ft.DatePicker(first_date=datetime.datetime(2000, 1, 1), last_date=datetime.datetime(2100, 12, 31), on_change=pick_end)
    page.overlay.extend([start_picker, end_picker])

    def open_start_p(_):
        try: start_picker.value = datetime.datetime.strptime(start_input.value, "%Y-%m-%d")
        except: start_picker.value = datetime.datetime.now()
        start_picker.open = True; page.update()

    def open_end_p(_):
        try: end_picker.value = datetime.datetime.strptime(end_input.value, "%Y-%m-%d")
        except: end_picker.value = datetime.datetime.now()
        end_picker.open = True; page.update()

    def apply_range(_):
        if start_state["val"] > end_state["val"]:
            err.value = "Start date must not be after end date."
            page.update()
            return
        if start_picker in page.overlay: page.overlay.remove(start_picker)
        if end_picker in page.overlay: page.overlay.remove(end_picker)
        page.pop_dialog()
        on_apply_callback(start_state["val"], end_state["val"])

    dialog = ft.AlertDialog(
        modal=True,
        bgcolor=CARD,
        title=ft.Text("Custom Date Range", weight=ft.FontWeight.BOLD, size=17, color=TEXT),
        content=ft.Container(
            ft.Column([
                ft.Row([start_input, ft.IconButton(ft.Icons.CALENDAR_MONTH_OUTLINED, on_click=open_start_p, icon_color=BLUE)]),
                ft.Row([end_input, ft.IconButton(ft.Icons.CALENDAR_MONTH_OUTLINED, on_click=open_end_p, icon_color=BLUE)]),
                err
            ], tight=True, spacing=12),
            width=360
        ),
        actions=[
            ft.TextButton("Cancel", on_click=lambda _: page.pop_dialog(), style=ft.ButtonStyle(color=MUTED)),
            ft.ElevatedButton("Apply Range", on_click=apply_range, style=ft.ButtonStyle(bgcolor=BLUE, color="#FFFFFF", shape=ft.RoundedRectangleBorder(radius=8)))
        ]
    )
    page.show_dialog(dialog)

def open_onboarding_dialog(page: ft.Page):
    """Clean, skippable 3-step onboarding guide explaining the personal finance workflow."""
    steps = [
        ("1. Track Daily Spending", "Add income and expenses in seconds with custom categories and notes.", ft.Icons.ADD_CARD_OUTLINED, "#2962D6"),
        ("2. Explore Insights & Trends", "View automatic cashflow summaries, category breakdowns, and monthly savings.", ft.Icons.INSIGHTS_OUTLINED, "#159B72"),
        ("3. 100% Local & Safe", "Your data stays on your device with instant Excel export and verifiable SQLite backups.", ft.Icons.SHIELD_OUTLINED, "#D9A65D"),
    ]

    items = []
    for title, desc, icon, color in steps:
        items.append(
            ft.Container(
                ft.Row([
                    ft.Container(
                        ft.Icon(icon, color=color, size=24),
                        bgcolor="#F0F4FD",
                        padding=10,
                        border_radius=10
                    ),
                    ft.Column([
                        ft.Text(title, size=14, weight=ft.FontWeight.BOLD, color=TEXT),
                        ft.Text(desc, size=12, color=MUTED),
                    ], spacing=2, expand=True)
                ], spacing=12, vertical_alignment=ft.CrossAxisAlignment.CENTER),
                padding=padding_box(vertical=6)
            )
        )

    dialog = ft.AlertDialog(
        modal=True,
        bgcolor=CARD,
        title=ft.Row([
            ft.Icon(ft.Icons.SAVINGS_ROUNDED, color=BLUE, size=26),
            ft.Text("Welcome to Finance Tracker", weight=ft.FontWeight.BOLD, size=18, color=TEXT)
        ], spacing=10),
        content=ft.Container(
            ft.Column(items, tight=True, spacing=8),
            width=400
        ),
        actions=[
            ft.ElevatedButton(
                "Get Started",
                on_click=lambda _: page.pop_dialog(),
                style=ft.ButtonStyle(bgcolor=BLUE, color="#FFFFFF", shape=ft.RoundedRectangleBorder(radius=8))
            )
        ]
    )
    page.show_dialog(dialog)
