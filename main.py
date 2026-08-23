import flet as ft
from db.database import init_db
from views.dashboard import dashboard_view
from views.transactions import transactions_view
from views.categories import categories_view

def main(page: ft.Page):
    page.title = "Finance Tracker"
    page.window.width = 900
    page.window.height = 700

    content_area = ft.Container(content=dashboard_view())

    def change_view(e):
        index = e.control.selected_index
        if index == 0:
            content_area.content = dashboard_view()
        elif index == 1:
            content_area.content = transactions_view(page)
        elif index == 2:
            content_area.content = categories_view(page)
        page.update()

    nav_rail = ft.NavigationRail(
        selected_index=0,
        label_type=ft.NavigationRailLabelType.ALL,
        destinations=[
            ft.NavigationRailDestination(icon=ft.Icons.DASHBOARD, label="Dashboard"),
            ft.NavigationRailDestination(icon=ft.Icons.LIST, label="Transactions"),
            ft.NavigationRailDestination(icon=ft.Icons.CATEGORY, label="Categories"),
        ],
        on_change=change_view,
    )

    page.add(
        ft.Row(
            [nav_rail, ft.VerticalDivider(width=1), content_area],
            expand=True,
        )
    )

if __name__ == "__main__":
    init_db()
    ft.run(main)
