import flet as ft

from db.categories import (
    CATEGORY_COLORS, add_category, get_categories, update_category, delete_category
)
from utils.responsive import (
    BG, CARD, TEXT, MUTED, BORDER, BLUE, GREEN, RED,
    is_mobile, padding_box, card_border, soft_color
)

def categories_view(page: ft.Page):
    state = {
        "editing_id": None,
        "selected_color": CATEGORY_COLORS[0],
        "type": "expense"
    }

    root = ft.Column(spacing=18, scroll=ft.ScrollMode.AUTO, expand=True)

    def make_card(content, padding=16):
        return ft.Container(
            content,
            padding=padding,
            bgcolor=CARD,
            border=card_border(),
            border_radius=12
        )

    name_input = ft.TextField(
        label="Category Name",
        hint_text="e.g. Health & Fitness, Investments...",
        border_color=BORDER,
        text_size=14,
        expand=True,
        content_padding=10
    )

    type_dropdown = ft.Dropdown(
        label="Type",
        value=state["type"],
        options=[
            ft.dropdown.Option("expense", "Expense"),
            ft.dropdown.Option("income", "Income"),
        ],
        on_select=lambda e: state.update({"type": e.control.value}),
        width=140,
        text_size=13,
        dense=True,
        border_color=BORDER,
        content_padding=padding_box(12, 8)
    )

    message_text = ft.Text("", size=12, color=MUTED)

    def select_color(col):
        state["selected_color"] = col
        refresh()

    def build_color_palette():
        items = []
        for col in CATEGORY_COLORS:
            is_selected = (col == state["selected_color"])
            items.append(
                ft.Container(
                    width=26,
                    height=26,
                    bgcolor=col,
                    border_radius=13,
                    border=ft.Border(
                        left=ft.BorderSide(2.5, "#18212F" if is_selected else col),
                        right=ft.BorderSide(2.5, "#18212F" if is_selected else col),
                        top=ft.BorderSide(2.5, "#18212F" if is_selected else col),
                        bottom=ft.BorderSide(2.5, "#18212F" if is_selected else col),
                    ) if is_selected else None,
                    ink=True,
                    on_click=lambda _, c=col: select_color(c),
                    tooltip=f"Select Color {col}"
                )
            )
        return ft.Row(items, spacing=8, wrap=True)

    def clear_form():
        state["editing_id"] = None
        state["selected_color"] = CATEGORY_COLORS[0]
        state["type"] = "expense"
        name_input.value = ""
        type_dropdown.value = "expense"
        message_text.value = ""
        refresh()

    def handle_save(_):
        cat_name = name_input.value.strip() if name_input.value else ""
        if not cat_name:
            message_text.value = "Please enter a category name."
            message_text.color = RED
            page.update()
            return

        if state["editing_id"]:
            update_category(state["editing_id"], cat_name, type_dropdown.value, state["selected_color"])
            message_text.value = "Category updated successfully."
            message_text.color = GREEN
        else:
            add_category(cat_name, type_dropdown.value, state["selected_color"])
            message_text.value = "Category added successfully."
            message_text.color = GREEN

        state["editing_id"] = None
        name_input.value = ""
        refresh()

    def start_edit(cat_tuple):
        cid, cname, ctype, ccolor = cat_tuple
        state["editing_id"] = cid
        state["selected_color"] = ccolor or CATEGORY_COLORS[0]
        state["type"] = ctype
        name_input.value = cname
        type_dropdown.value = ctype
        message_text.value = f"Editing '{cname}'..."
        message_text.color = BLUE
        refresh()

    def handle_delete(cid, cname):
        success = delete_category(cid)
        if success:
            message_text.value = f"Category '{cname}' deleted."
            message_text.color = GREEN
            if state["editing_id"] == cid:
                clear_form()
            else:
                refresh()
        else:
            message_text.value = f"Cannot delete '{cname}': It is linked to existing transactions."
            message_text.color = RED
            page.update()

    def refresh():
        mobile = is_mobile(page)
        cats = get_categories()

        # Header
        header = ft.Row([
            ft.Column([
                ft.Text("Categories", size=20 if mobile else 22, weight=ft.FontWeight.BOLD, color=TEXT),
                ft.Text("Organize income and expense groupings", color=MUTED, size=12),
            ], spacing=2)
        ])

        # Save/Action Button
        save_btn = ft.ElevatedButton(
            "Update" if state["editing_id"] else "Add Category",
            icon=ft.Icons.CHECK_ROUNDED if state["editing_id"] else ft.Icons.ADD_ROUNDED,
            on_click=handle_save,
            style=ft.ButtonStyle(
                bgcolor=BLUE,
                color="#FFFFFF",
                padding=padding_box(16, 10),
                shape=ft.RoundedRectangleBorder(radius=8)
            )
        )

        cancel_btn = ft.TextButton(
            "Cancel",
            on_click=lambda _: clear_form(),
            style=ft.ButtonStyle(color=MUTED)
        ) if state["editing_id"] else ft.Container()

        # Form Section
        if mobile:
            form_content = ft.Column([
                name_input,
                type_dropdown,
                ft.Column([
                    ft.Text("Badge Color", size=12, color=MUTED, weight=ft.FontWeight.W_500),
                    build_color_palette()
                ], spacing=6),
                ft.Row([save_btn, cancel_btn], spacing=8),
                message_text
            ], spacing=10)
        else:
            form_content = ft.Column([
                ft.Row([name_input, type_dropdown, save_btn, cancel_btn], spacing=10, vertical_alignment=ft.CrossAxisAlignment.CENTER),
                ft.Row([
                    ft.Text("Badge Color:", size=12, color=MUTED, weight=ft.FontWeight.W_500),
                    build_color_palette(),
                    message_text
                ], spacing=12, vertical_alignment=ft.CrossAxisAlignment.CENTER)
            ], spacing=10)

        form_card = make_card(form_content)

        # Categories List
        income_cats = [c for c in cats if c[2] == "income"]
        expense_cats = [c for c in cats if c[2] == "expense"]

        def build_cat_items(cat_list):
            if not cat_list:
                return ft.Text("No categories in this group.", size=12, color=MUTED)
            items = []
            for c in cat_list:
                cid, cname, ctype, ccolor = c
                col = ccolor or (GREEN if ctype == "income" else RED)
                items.append(
                    ft.Container(
                        ft.Row([
                            ft.Row([
                                ft.Container(width=10, height=10, bgcolor=col, border_radius=5),
                                ft.Text(cname, size=13, weight=ft.FontWeight.W_500, color=TEXT),
                            ], spacing=8),
                            ft.Row([
                                ft.IconButton(
                                    ft.Icons.EDIT_OUTLINED,
                                    icon_size=16,
                                    icon_color=MUTED,
                                    tooltip="Edit Category",
                                    on_click=lambda _, val=c: start_edit(val)
                                ),
                                ft.IconButton(
                                    ft.Icons.DELETE_OUTLINE,
                                    icon_size=16,
                                    icon_color=RED,
                                    tooltip="Delete Category",
                                    on_click=lambda _, tid=cid, name=cname: handle_delete(tid, name)
                                ),
                            ], spacing=0)
                        ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN, vertical_alignment=ft.CrossAxisAlignment.CENTER),
                        padding=padding_box(vertical=6),
                        border=ft.Border(bottom=ft.BorderSide(1, "#F0F2F5"))
                    )
                )
            return ft.Column(items, spacing=0)

        exp_card = make_card(
            ft.Column([
                ft.Row([
                    ft.Text("Expense Categories", size=15, weight=ft.FontWeight.BOLD, color=TEXT),
                    ft.Text(f"{len(expense_cats)} total", size=12, color=MUTED)
                ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
                build_cat_items(expense_cats)
            ], spacing=8),
            padding=16
        )

        inc_card = make_card(
            ft.Column([
                ft.Row([
                    ft.Text("Income Categories", size=15, weight=ft.FontWeight.BOLD, color=TEXT),
                    ft.Text(f"{len(income_cats)} total", size=12, color=MUTED)
                ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
                build_cat_items(income_cats)
            ], spacing=8),
            padding=16
        )

        if mobile:
            lists_section = ft.Column([exp_card, inc_card], spacing=12)
        else:
            lists_section = ft.Row([
                ft.Container(exp_card, expand=1),
                ft.Container(inc_card, expand=1)
            ], spacing=14, vertical_alignment=ft.CrossAxisAlignment.START)

        root.controls = [
            header,
            form_card,
            lists_section
        ]
        page.update()

    refresh()

    pad_h = 16 if is_mobile(page) else 28
    pad_v = 16 if is_mobile(page) else 24
    return ft.Container(root, padding=padding_box(pad_h, pad_v), expand=True, bgcolor=BG)
