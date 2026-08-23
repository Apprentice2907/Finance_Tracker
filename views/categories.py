import flet as ft
from db.categories import add_category, get_categories, delete_category

def categories_view(page: ft.Page):
    name_input = ft.TextField(label="Category Name", width=200)
    type_dropdown = ft.Dropdown(
        label="Type",
        width=150,
        options=[
            ft.dropdown.Option("income"),
            ft.dropdown.Option("expense"),
        ],
    )
    category_list = ft.Column()

    def refresh_list():
        category_list.controls.clear()
        for cat in get_categories():
            cat_id, cat_name, cat_type = cat
            category_list.controls.append(
                ft.Row([
                    ft.Text(f"{cat_name} ({cat_type})", width=250),
                    ft.IconButton(
                        icon=ft.Icons.DELETE,
                        on_click=lambda e, id=cat_id: handle_delete(id),
                    ),
                ])
            )
        page.update()


    def handle_add(e):
        if name_input.value and type_dropdown.value:
            add_category(name_input.value, type_dropdown.value)
            name_input.value = ""
            type_dropdown.value = None
            refresh_list()

    def handle_delete(cat_id):
        success = delete_category(cat_id)
        if not success:
            page.snack_bar = ft.SnackBar(ft.Text("Can't delete — category is used by existing transactions."))
            page.snack_bar.open = True
        refresh_list()
        page.update()

    refresh_list()

    return ft.Column([
        ft.Text("Categories", size=24, weight=ft.FontWeight.BOLD),
        ft.Row([name_input, type_dropdown, ft.ElevatedButton("Add", on_click=handle_add)]),
        category_list,
    ])

