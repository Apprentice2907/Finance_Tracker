import os
import sys
import tempfile

# Configure writable cache directory for matplotlib on Android/embedded runtimes
if "MPLCONFIGDIR" not in os.environ:
    try:
        mpl_dir = os.path.join(tempfile.gettempdir(), "matplotlib")
        os.makedirs(mpl_dir, exist_ok=True)
        os.environ["MPLCONFIGDIR"] = mpl_dir
    except Exception:
        pass

import flet as ft

from db.database import init_db
from views.dashboard import dashboard_view
from views.transactions import transactions_view
from views.accounts_view import accounts_view
from views.reports import reports_view
from views.categories import categories_view
from views.settings_view import settings_view
from views.dialogs import open_transaction_dialog
from utils.responsive import (
    BG, CARD, TEXT, MUTED, BORDER, BLUE, BLUE_LIGHT, GREEN,
    is_mobile, padding_box, card_border
)

def main(page: ft.Page):
    page.title = "Finance Tracker"
    page.padding = 0
    page.bgcolor = BG
    page.theme_mode = ft.ThemeMode.LIGHT

    # Safe desktop window properties (avoid crash on mobile/web)
    try:
        if page.window:
            page.window.width = 1120
            page.window.height = 780
            page.window.min_width = 340
            page.window.min_height = 480
    except Exception:
        pass

    # Active tab state: 0=Dashboard, 1=Transactions, 2=Accounts, 3=Reports, 4=Categories, 5=Settings
    state = {
        "current_tab": 0
    }

    content_area = ft.Container(expand=True)

    def navigate_to(tab_index: int):
        state["current_tab"] = tab_index
        render_current_view()

    def render_current_view():
        tab = state["current_tab"]
        if tab == 0:
            view = dashboard_view(page, on_navigate=navigate_to)
        elif tab == 1:
            view = transactions_view(page)
        elif tab == 2:
            view = accounts_view(page)
        elif tab == 3:
            view = reports_view(page)
        elif tab == 4:
            view = categories_view(page)
        elif tab == 5:
            view = settings_view(page, on_data_restored_callback=lambda: navigate_to(0))
        else:
            view = dashboard_view(page, on_navigate=navigate_to)

        content_area.content = view
        update_navigation_chrome()
        page.update()

    # --- Mobile Navigation Bar ---
    nav_bar = ft.NavigationBar(
        selected_index=0,
        on_change=lambda e: navigate_to(e.control.selected_index),
        destinations=[
            ft.NavigationBarDestination(icon=ft.Icons.DASHBOARD_OUTLINED, selected_icon=ft.Icons.DASHBOARD_ROUNDED, label="Dashboard"),
            ft.NavigationBarDestination(icon=ft.Icons.RECEIPT_LONG_OUTLINED, selected_icon=ft.Icons.RECEIPT_LONG_ROUNDED, label="Transactions"),
            ft.NavigationBarDestination(icon=ft.Icons.ACCOUNT_BALANCE_OUTLINED, selected_icon=ft.Icons.ACCOUNT_BALANCE_ROUNDED, label="Accounts"),
            ft.NavigationBarDestination(icon=ft.Icons.INSIGHTS_OUTLINED, selected_icon=ft.Icons.INSIGHTS_ROUNDED, label="Reports"),
            ft.NavigationBarDestination(icon=ft.Icons.CATEGORY_OUTLINED, selected_icon=ft.Icons.CATEGORY_ROUNDED, label="Categories"),
            ft.NavigationBarDestination(icon=ft.Icons.SETTINGS_OUTLINED, selected_icon=ft.Icons.SETTINGS_ROUNDED, label="Settings"),
        ],
        bgcolor=CARD,
        indicator_color=BLUE_LIGHT,
        height=62
    )

    # --- Desktop Header Navigation ---
    def desktop_nav_btn(index, label, icon):
        is_active = (state["current_tab"] == index)
        return ft.TextButton(
            content=ft.Row([
                ft.Icon(icon, size=16, color=BLUE if is_active else MUTED),
                ft.Text(label, size=13, weight=ft.FontWeight.W_600 if is_active else ft.FontWeight.W_400, color=TEXT if is_active else MUTED)
            ], spacing=6, tight=True),
            on_click=lambda _: navigate_to(index),
            style=ft.ButtonStyle(
                bgcolor=BLUE_LIGHT if is_active else None,
                padding=padding_box(12, 8),
                shape=ft.RoundedRectangleBorder(radius=8)
            )
        )

    def build_desktop_header():
        return ft.Container(
            ft.Row([
                # Logo & Title
                ft.Row([
                    ft.Container(
                        ft.Icon(ft.Icons.ACCOUNT_BALANCE_WALLET_ROUNDED, color=BLUE, size=20),
                        bgcolor=BLUE_LIGHT,
                        padding=8,
                        border_radius=9
                    ),
                    ft.Text("Finance Tracker", size=18, weight=ft.FontWeight.BOLD, color=TEXT),
                ], spacing=10),

                # Desktop Navigation Links
                ft.Row([
                    desktop_nav_btn(0, "Dashboard", ft.Icons.DASHBOARD_ROUNDED),
                    desktop_nav_btn(1, "Transactions", ft.Icons.RECEIPT_LONG_ROUNDED),
                    desktop_nav_btn(2, "Accounts", ft.Icons.ACCOUNT_BALANCE_ROUNDED),
                    desktop_nav_btn(3, "Reports", ft.Icons.INSIGHTS_ROUNDED),
                    desktop_nav_btn(4, "Categories", ft.Icons.CATEGORY_ROUNDED),
                    desktop_nav_btn(5, "Settings", ft.Icons.SETTINGS_ROUNDED),
                ], spacing=4),

                # Quick Add Button
                ft.ElevatedButton(
                    "Add Transaction",
                    icon=ft.Icons.ADD_ROUNDED,
                    on_click=lambda _: open_transaction_dialog(page, on_success_callback=render_current_view),
                    style=ft.ButtonStyle(
                        bgcolor=BLUE,
                        color="#FFFFFF",
                        padding=padding_box(14, 10),
                        shape=ft.RoundedRectangleBorder(radius=8)
                    )
                )
            ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN, vertical_alignment=ft.CrossAxisAlignment.CENTER),
            padding=padding_box(24, 12),
            bgcolor=CARD,
            border=ft.Border(bottom=ft.BorderSide(1, BORDER))
        )

    desktop_header_container = ft.Container()

    # Floating Action Button for Mobile
    fab = ft.FloatingActionButton(
        icon=ft.Icons.ADD_ROUNDED,
        bgcolor=BLUE,
        foreground_color="#FFFFFF",
        tooltip="Add Transaction",
        on_click=lambda _: open_transaction_dialog(page, on_success_callback=render_current_view)
    )

    def update_navigation_chrome():
        mobile = is_mobile(page)
        nav_bar.selected_index = state["current_tab"]

        if mobile:
            desktop_header_container.content = None
            desktop_header_container.visible = False
            page.navigation_bar = nav_bar
            page.floating_action_button = fab
        else:
            desktop_header_container.content = build_desktop_header()
            desktop_header_container.visible = True
            page.navigation_bar = None
            page.floating_action_button = None

    # Handle screen resize dynamically
    def on_resize(e):
        update_navigation_chrome()
        render_current_view()

    page.on_resized = on_resize

    # Main App Layout
    page.add(
        ft.Column([
            desktop_header_container,
            content_area
        ], spacing=0, expand=True)
    )

    # Initial Render
    render_current_view()

if __name__ == "__main__":
    init_db()
    if "--web" in sys.argv or "-w" in sys.argv:
        port = 8550
        for idx, arg in enumerate(sys.argv):
            if arg in ("-p", "--port") and idx + 1 < len(sys.argv):
                try:
                    port = int(sys.argv[idx + 1])
                except ValueError:
                    pass
        print(f"Starting Finance Tracker Web Server on port {port}...")
        ft.app(target=main, view=ft.AppView.WEB_BROWSER, host="0.0.0.0", port=port)
    else:
        ft.run(main)
