import flet as ft
import datetime
from db.transactions import get_transactions, add_transaction, update_transaction, delete_transaction
from db.categories import get_categories

def transactions_view(page: ft.Page):
    transaction_list = ft.Column()
    editing_id = {"value": None}

    # Holds the currently active category dropdown instance
    active_cat = {"dd": None}

    # Column used as a slot — we clear & re-add a fresh Dropdown into it each time
    cat_slot = ft.Column(controls=[], spacing=0)

    # --- Form fields ---
    type_dropdown = ft.Dropdown(
        label="Type", width=150,
        options=[ft.dropdown.Option("income"), ft.dropdown.Option("expense")],
    )

    amount_input = ft.TextField(label="Amount", width=120)
    date_input   = ft.TextField(label="Date (YYYY-MM-DD)", width=150, hint_text="YYYY-MM-DD")

    # --- Date picker (Flet 0.x compatible) ---
    def handle_date_picked(e):
        if e.control.value:
            date_input.value = e.control.value.strftime("%Y-%m-%d")
            page.update()

    date_picker = ft.DatePicker(
        first_date=datetime.datetime(2000, 1, 1),
        last_date=datetime.datetime(2100, 12, 31),
        on_change=handle_date_picked,
    )
    page.overlay.append(date_picker)

    def open_date_picker(e):
        try:
            if date_input.value:
                date_picker.value = datetime.datetime.strptime(date_input.value, "%Y-%m-%d")
        except ValueError:
            date_picker.value = datetime.datetime.now()
        date_picker.open = True
        page.update()

    calendar_btn = ft.IconButton(
        icon=ft.Icons.CALENDAR_MONTH,
        tooltip="Pick a date",
        on_click=open_date_picker,
    )
    date_row = ft.Row([date_input, calendar_btn], spacing=0, tight=True)

    note_input  = ft.TextField(label="Note", width=200)
    save_button = ft.ElevatedButton("Add")

    # --- Category helpers ---

    def build_category_dropdown(type_val, selected_id=None):
        """Always create a fresh Dropdown — never mutate options of an existing one."""
        cats = get_categories(type_val) if type_val else []
        if cats:
            opts = [ft.dropdown.Option(key=str(c[0]), text=c[1]) for c in cats]
            val  = str(selected_id) if selected_id else None
        else:
            opts = [ft.dropdown.Option(key="", text="No categories — add in Categories tab", disabled=True)]
            val  = ""
        dd = ft.Dropdown(label="Category (optional)", width=180, options=opts, value=val)
        return dd

    def reload_cat_slot(type_val, selected_id=None):
        new_dd = build_category_dropdown(type_val, selected_id)
        active_cat["dd"] = new_dd
        cat_slot.controls.clear()
        cat_slot.controls.append(new_dd)

    def on_type_change(e):
        reload_cat_slot(type_dropdown.value)
        page.update()

    type_dropdown.on_select = on_type_change

    # Initialise slot with empty placeholder
    placeholder = ft.Dropdown(
        label="Category (optional)", width=180,
        options=[ft.dropdown.Option(key="", text="Select a type first", disabled=True)],
        value="",
    )
    active_cat["dd"] = placeholder
    cat_slot.controls.append(placeholder)

    # --- General helpers ---

    def show_snack(msg):
        page.snack_bar = ft.SnackBar(ft.Text(msg))
        page.snack_bar.open = True
        page.update()

    def refresh_list():
        transaction_list.controls.clear()
        for t in get_transactions():
            t_id, t_type, t_amount, t_category_id, t_category_name, t_date, t_note = t
            color = ft.Colors.GREEN if t_type == "income" else ft.Colors.RED
            transaction_list.controls.append(
                ft.Row([
                    ft.Text(t_date, width=110),
                    ft.Text(t_category_name or "—", width=130),
                    ft.Text(f"₹{t_amount:.2f}", color=color, width=100),
                    ft.Text(t_note or "", width=180),
                    ft.IconButton(icon=ft.Icons.EDIT,   on_click=lambda e, row=t: start_edit(row)),
                    ft.IconButton(icon=ft.Icons.DELETE, on_click=lambda e, tid=t_id: handle_delete(tid)),
                ])
            )
        page.update()

    def clear_form():
        editing_id["value"]  = None
        type_dropdown.value  = None
        # Reset slot to placeholder
        placeholder2 = ft.Dropdown(
            label="Category (optional)", width=180,
            options=[ft.dropdown.Option(key="", text="Select a type first", disabled=True)],
            value="",
        )
        active_cat["dd"] = placeholder2
        cat_slot.controls.clear()
        cat_slot.controls.append(placeholder2)
        amount_input.value  = ""
        date_input.value    = ""
        note_input.value    = ""
        save_button.text    = "Add"

    def start_edit(row):
        t_id, t_type, t_amount, t_category_id, t_category_name, t_date, t_note = row
        editing_id["value"] = t_id
        type_dropdown.value = t_type
        reload_cat_slot(t_type, selected_id=t_category_id)
        amount_input.value  = str(t_amount)
        date_input.value    = t_date
        note_input.value    = t_note or ""
        save_button.text    = "Update"
        page.update()

    def handle_delete(t_id):
        delete_transaction(t_id)
        clear_form()
        refresh_list()

    def handle_save(e):
        t   = type_dropdown.value
        amt = amount_input.value.strip()
        dt  = date_input.value.strip()
        dd  = active_cat["dd"]
        cat = dd.value if dd and dd.value and dd.value != "" else None

        if not t:
            show_snack("Please select a Type!"); return
        if not amt:
            show_snack("Please enter an Amount!"); return
        if not dt:
            show_snack("Please enter a Date!"); return

        try:
            amt_f = float(amt)
        except ValueError:
            show_snack("Amount must be a valid number!"); return

        cat_id = int(cat) if cat else None
        args = (t, amt_f, cat_id, dt, note_input.value)
        if editing_id["value"]:
            update_transaction(editing_id["value"], *args)
        else:
            add_transaction(*args)

        clear_form()
        refresh_list()

    save_button.on_click = handle_save

    refresh_list()

    return ft.Column([
        ft.Text("Transactions", size=24, weight=ft.FontWeight.BOLD),
        ft.Row([type_dropdown, cat_slot, amount_input, date_row, note_input, save_button],
               wrap=True),
        transaction_list,
    ])