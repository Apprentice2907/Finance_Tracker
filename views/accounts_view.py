import flet as ft
from db.accounts import (
    ACCOUNT_TYPES, get_accounts, get_account,
    update_account, update_account_balance, delete_account,
    get_total_balance, get_balances_by_type
)
from db.categories import CATEGORY_COLORS
from utils.responsive import (
    BG, CARD, TEXT, MUTED, BORDER, BLUE, GREEN, RED,
    is_mobile, padding_box, card_border, soft_color, format_currency
)

TYPE_ICONS = {
    "bank": ft.Icons.ACCOUNT_BALANCE_ROUNDED,
    "investment": ft.Icons.SHOW_CHART_ROUNDED,
    "wallet": ft.Icons.ACCOUNT_BALANCE_WALLET_ROUNDED,
    "savings": ft.Icons.SAVINGS_ROUNDED,
    "credit": ft.Icons.CREDIT_CARD_ROUNDED,
    "other": ft.Icons.PAYMENTS_ROUNDED,
}

TYPE_LABELS = {
    "bank": "Bank Account",
    "investment": "Investment / Demat",
    "wallet": "Cash / Wallet",
    "savings": "Savings / FD",
    "credit": "Credit Card",
    "other": "Asset / Other",
}

def accounts_view(page: ft.Page):
    root = ft.Column(spacing=16, scroll=ft.ScrollMode.AUTO, expand=True)

    def make_card(content, padding=16):
        return ft.Container(
            content,
            padding=padding,
            bgcolor=CARD,
            border=card_border(),
            border_radius=12
        )

    def refresh():
        render()
        page.update()

    def open_account_modal(account_data):
        acc_id = account_data[0]
        initial_name = account_data[1]
        initial_type = account_data[2]
        initial_balance = str(account_data[3])
        initial_acc_num = account_data[4]
        initial_color = account_data[5] if account_data[5] else CATEGORY_COLORS[0]

        modal_state = {
            "type": initial_type,
            "color": initial_color
        }

        name_input = ft.TextField(
            label="Account / Bank Name",
            hint_text="e.g. HDFC Bank, SBI, Angel One, Cash...",
            value=initial_name,
            border_color=BORDER,
            text_size=14,
            content_padding=12
        )

        type_dropdown = ft.Dropdown(
            label="Account Type",
            value=modal_state["type"],
            options=[ft.dropdown.Option(k, v) for k, v in ACCOUNT_TYPES],
            on_select=lambda e: modal_state.update({"type": e.control.value}),
            border_color=BORDER,
            text_size=14,
            dense=True,
            content_padding=padding_box(12, 10)
        )

        balance_input = ft.TextField(
            label="Current Balance (₹)",
            hint_text="0.00",
            keyboard_type=ft.KeyboardType.NUMBER,
            value=initial_balance,
            border_color=BORDER,
            text_size=15,
            content_padding=12
        )

        acc_num_input = ft.TextField(
            label="Account # / Notes (Optional)",
            hint_text="e.g. A/C ending 4589 or Demat ID",
            value=initial_acc_num,
            border_color=BORDER,
            text_size=14,
            content_padding=12
        )

        error_msg = ft.Text("", color=RED, size=12)

        def save_account(_):
            name_val = name_input.value.strip() if name_input.value else ""
            if not name_val:
                error_msg.value = "Please enter an account name."
                page.update()
                return

            bal_str = balance_input.value.strip() if balance_input.value else "0"
            try:
                bal_val = float(bal_str)
            except ValueError:
                error_msg.value = "Please enter a valid numeric balance."
                page.update()
                return

            try:
                update_account(
                    acc_id,
                    name=name_val,
                    type_val=modal_state["type"],
                    balance=bal_val,
                    account_number=acc_num_input.value.strip() if acc_num_input.value else "",
                    color=modal_state["color"]
                )
                page.pop_dialog()
                refresh()
            except Exception as ex:
                error_msg.value = f"Failed to save: {str(ex)}"
                page.update()

        dialog = ft.AlertDialog(
            modal=True,
            bgcolor=CARD,
            title=ft.Text("Edit Account Details", weight=ft.FontWeight.BOLD, size=18, color=TEXT),
            content=ft.Container(
                ft.Column([
                    name_input,
                    type_dropdown,
                    balance_input,
                    acc_num_input,
                    error_msg
                ], spacing=12, tight=True, scroll=ft.ScrollMode.AUTO),
                width=380 if not is_mobile(page) else None,
                padding=padding_box(4, 4)
            ),
            actions=[
                ft.TextButton("Cancel", on_click=lambda _: page.pop_dialog(), style=ft.ButtonStyle(color=MUTED)),
                ft.ElevatedButton("Save Changes", on_click=save_account, style=ft.ButtonStyle(bgcolor=BLUE, color="#FFFFFF", shape=ft.RoundedRectangleBorder(radius=8))),
            ],
            actions_alignment=ft.MainAxisAlignment.END
        )
        page.show_dialog(dialog)

    def open_quick_balance_dialog(account_data):
        acc_id, acc_name, _, cur_bal, _, _, _ = account_data
        bal_input = ft.TextField(
            label="Updated Balance (₹)",
            value=f"{cur_bal:.2f}",
            keyboard_type=ft.KeyboardType.NUMBER,
            autofocus=True,
            border_color=BORDER,
            text_size=16,
            content_padding=12
        )
        err_text = ft.Text("", color=RED, size=12)

        def save_quick_bal(_):
            try:
                new_bal = float(bal_input.value.strip())
                update_account_balance(acc_id, new_bal)
                page.pop_dialog()
                refresh()
            except ValueError:
                err_text.value = "Enter a valid numeric balance."
                page.update()

        dialog = ft.AlertDialog(
            modal=True,
            bgcolor=CARD,
            title=ft.Text(f"Update Balance: {acc_name}", weight=ft.FontWeight.BOLD, size=16, color=TEXT),
            content=ft.Container(
                ft.Column([
                    ft.Text(f"Current recorded balance: {format_currency(cur_bal)}", size=13, color=MUTED),
                    bal_input,
                    err_text
                ], spacing=10, tight=True),
                width=340 if not is_mobile(page) else None
            ),
            actions=[
                ft.TextButton("Cancel", on_click=lambda _: page.pop_dialog(), style=ft.ButtonStyle(color=MUTED)),
                ft.ElevatedButton("Save Balance", on_click=save_quick_bal, style=ft.ButtonStyle(bgcolor=BLUE, color="#FFFFFF", shape=ft.RoundedRectangleBorder(radius=8)))
            ]
        )
        page.show_dialog(dialog)

    def confirm_delete_account(acc_id, acc_name):
        def do_delete(_):
            delete_account(acc_id)
            page.pop_dialog()
            refresh()

        dialog = ft.AlertDialog(
            modal=True,
            bgcolor=CARD,
            title=ft.Text("Delete Account?", weight=ft.FontWeight.BOLD, size=16, color=TEXT),
            content=ft.Text(f"Are you sure you want to remove '{acc_name}'?", size=13, color=MUTED),
            actions=[
                ft.TextButton("Cancel", on_click=lambda _: page.pop_dialog(), style=ft.ButtonStyle(color=MUTED)),
                ft.ElevatedButton("Delete", on_click=do_delete, style=ft.ButtonStyle(bgcolor=RED, color="#FFFFFF", shape=ft.RoundedRectangleBorder(radius=8)))
            ]
        )
        page.show_dialog(dialog)

    def render():
        mobile = is_mobile(page)
        accounts = get_accounts()
        total_balance = get_total_balance()
        by_type = get_balances_by_type()

        # Clean Header (without Add Account button)
        header = ft.Container(
            ft.Column([
                ft.Text("Accounts & Balances", size=22 if not mobile else 18, weight=ft.FontWeight.BOLD, color=TEXT),
                ft.Text("Track live bank balances, investments, and total liquid funds", size=12, color=MUTED),
            ], spacing=2),
            padding=padding_box(vertical=4)
        )

        # Hero Net Worth Card
        breakdown_chips = []
        for t_val, t_sum, t_count in by_type:
            icon = TYPE_ICONS.get(t_val, ft.Icons.PAYMENTS_ROUNDED)
            label = TYPE_LABELS.get(t_val, t_val.title())
            breakdown_chips.append(
                ft.Container(
                    ft.Row([
                        ft.Icon(icon, size=14, color=BLUE),
                        ft.Text(f"{label} ({t_count}):", size=12, color=MUTED),
                        ft.Text(format_currency(t_sum), size=12, weight=ft.FontWeight.BOLD, color=TEXT),
                    ], spacing=6, tight=True),
                    bgcolor="#F0F4FA",
                    padding=padding_box(10, 6),
                    border_radius=8
                )
            )

        hero_card = make_card(
            ft.Column([
                ft.Row([
                    ft.Column([
                        ft.Text("TOTAL LIQUID BALANCE", size=11, weight=ft.FontWeight.BOLD, color=MUTED),
                        ft.Text(
                            format_currency(total_balance),
                            size=28 if not mobile else 22,
                            weight=ft.FontWeight.BOLD,
                            color=GREEN if total_balance >= 0 else RED
                        ),
                    ], spacing=2),
                    ft.Container(
                        ft.Icon(ft.Icons.ACCOUNT_BALANCE_ROUNDED, size=28, color=BLUE),
                        bgcolor=soft_color(BLUE),
                        padding=12,
                        border_radius=12
                    )
                ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
                ft.Divider(height=16, color="#EAEAEA"),
                ft.Text("Breakdown by Category:", size=11, color=MUTED, weight=ft.FontWeight.W_500),
                ft.Row(breakdown_chips if breakdown_chips else [ft.Text("No accounts added.", size=12, color=MUTED)], wrap=True, spacing=8)
            ], spacing=8),
            padding=18
        )

        # Accounts List / Cards
        if not accounts:
            account_items = make_card(
                ft.Column([
                    ft.Icon(ft.Icons.ACCOUNT_BALANCE_OUTLINED, size=36, color="#B3BBC7"),
                    ft.Text("No accounts found", size=15, weight=ft.FontWeight.W_500, color=TEXT),
                    ft.Text("No accounts currently configured.", size=12, color=MUTED),
                ], horizontal_alignment=ft.CrossAxisAlignment.CENTER, spacing=6),
                padding=32
            )
        else:
            cards = []
            for acc in accounts:
                acc_id, acc_name, acc_type, acc_bal, acc_num, acc_col, acc_upd = acc
                icon = TYPE_ICONS.get(acc_type, ft.Icons.ACCOUNT_BALANCE_ROUNDED)
                type_name = TYPE_LABELS.get(acc_type, acc_type.title())

                if not mobile:
                    # Desktop Row
                    card_content = ft.Row([
                        # Icon
                        ft.Container(
                            ft.Icon(icon, size=18, color=acc_col),
                            bgcolor=soft_color(acc_col),
                            padding=9,
                            border_radius=9
                        ),
                        # Name & Details
                        ft.Column([
                            ft.Row([
                                ft.Text(acc_name, weight=ft.FontWeight.BOLD, color=TEXT, size=13.5),
                                ft.Container(
                                    ft.Text(type_name, size=10, weight=ft.FontWeight.W_500, color=BLUE),
                                    bgcolor="#EAF1FF",
                                    padding=padding_box(6, 2),
                                    border_radius=4
                                )
                            ], spacing=8, vertical_alignment=ft.CrossAxisAlignment.CENTER),
                            ft.Text(
                                (f"{acc_num} · " if acc_num else "") + (f"Updated: {acc_upd[:10]}" if acc_upd else "Active"),
                                size=11, color=MUTED
                            )
                        ], spacing=2, expand=True),
                        # Balance & Fast Action
                        ft.Column([
                            ft.Text(
                                format_currency(acc_bal),
                                size=14.5,
                                weight=ft.FontWeight.BOLD,
                                color=GREEN if acc_bal >= 0 else RED
                            ),
                            ft.TextButton(
                                "Quick Update",
                                on_click=lambda _, a=acc: open_quick_balance_dialog(a),
                                style=ft.ButtonStyle(
                                    color=BLUE,
                                    padding=padding_box(4, 0)
                                )
                            )
                        ], horizontal_alignment=ft.CrossAxisAlignment.END, spacing=0),
                        # Edit / Delete
                        ft.IconButton(
                            ft.Icons.EDIT_OUTLINED,
                            icon_size=16,
                            icon_color=MUTED,
                            tooltip="Edit Details",
                            on_click=lambda _, a=acc: open_account_modal(a)
                        ),
                        ft.IconButton(
                            ft.Icons.DELETE_OUTLINE,
                            icon_size=16,
                            icon_color=RED,
                            tooltip="Delete",
                            on_click=lambda _, aid=acc_id, aname=acc_name: confirm_delete_account(aid, aname)
                        )
                    ], vertical_alignment=ft.CrossAxisAlignment.CENTER)
                else:
                    # Mobile Responsive Row
                    card_content = ft.Column([
                        ft.Row([
                            ft.Container(
                                ft.Icon(icon, size=16, color=acc_col),
                                bgcolor=soft_color(acc_col),
                                padding=8,
                                border_radius=8
                            ),
                            ft.Column([
                                ft.Text(acc_name, weight=ft.FontWeight.BOLD, color=TEXT, size=13),
                                ft.Text(type_name, size=10, color=MUTED),
                            ], spacing=1, expand=True),
                            ft.Text(
                                format_currency(acc_bal),
                                size=14,
                                weight=ft.FontWeight.BOLD,
                                color=GREEN if acc_bal >= 0 else RED
                            ),
                        ], vertical_alignment=ft.CrossAxisAlignment.CENTER),
                        ft.Row([
                            ft.Text(
                                (f"{acc_num} · " if acc_num else "") + (f"Updated: {acc_upd[:10]}" if acc_upd else "Active"),
                                size=10.5, color=MUTED, expand=True
                            ),
                            ft.TextButton(
                                "Quick Update",
                                on_click=lambda _, a=acc: open_quick_balance_dialog(a),
                                style=ft.ButtonStyle(
                                    color=BLUE,
                                    padding=padding_box(4, 0)
                                )
                            ),
                            ft.IconButton(
                                ft.Icons.EDIT_OUTLINED,
                                icon_size=15,
                                icon_color=MUTED,
                                tooltip="Edit",
                                on_click=lambda _, a=acc: open_account_modal(a)
                            ),
                            ft.IconButton(
                                ft.Icons.DELETE_OUTLINE,
                                icon_size=15,
                                icon_color=RED,
                                tooltip="Delete",
                                on_click=lambda _, aid=acc_id, aname=acc_name: confirm_delete_account(aid, aname)
                            )
                        ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN, vertical_alignment=ft.CrossAxisAlignment.CENTER)
                    ], spacing=6)

                card = ft.Container(
                    card_content,
                    padding=padding_box(vertical=8),
                    border=ft.Border(bottom=ft.BorderSide(1, "#F0F2F5"))
                )
                cards.append(card)

            account_items = make_card(ft.Column(cards, spacing=0), padding=16)

        root.controls = [
            header,
            hero_card,
            ft.Text("Your Accounts & Portfolios", weight=ft.FontWeight.BOLD, size=14, color=TEXT),
            account_items
        ]

    render()
    
    pad_h = 16 if is_mobile(page) else 28
    pad_v = 16 if is_mobile(page) else 24
    return ft.Container(root, padding=padding_box(pad_h, pad_v), expand=True, bgcolor=BG)
