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
        p_str = str(getattr(page, "platform", "")).lower()
        if p_str in ("windows", "macos", "linux") and page.window:
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

    NAV_ITEMS = [
        (0, "Dashboard"),
        (1, "Transactions"),
        (2, "Accounts"),
        (3, "Reports"),
        (4, "Categories"),
        (5, "Settings"),
    ]

    header_container = ft.Container()

    # Floating Action Button for Mobile
    fab = ft.FloatingActionButton(
        icon=ft.Icons.ADD_ROUNDED,
        bgcolor=BLUE,
        foreground_color="#FFFFFF",
        tooltip="Add Transaction",
        on_click=lambda _: open_transaction_dialog(page, on_success_callback=render_current_view)
    )

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

    def build_header():
        mobile = is_mobile(page)

        brand = ft.Row([
            ft.Container(
                ft.Icon(ft.Icons.ACCOUNT_BALANCE_WALLET_ROUNDED, color=BLUE, size=18 if mobile else 20),
                bgcolor=BLUE_LIGHT,
                padding=6 if mobile else 8,
                border_radius=8
            ),
            ft.Text(
                "Finance Tracker",
                size=15 if mobile else 18,
                weight=ft.FontWeight.BOLD,
                color=TEXT,
                no_wrap=True
            ),
        ], spacing=8, vertical_alignment=ft.CrossAxisAlignment.CENTER)

        if not mobile:
            # Full Desktop Navigation
            header_content = ft.Row([
                brand,
                ft.Row([
                    desktop_nav_btn(0, "Dashboard", ft.Icons.DASHBOARD_ROUNDED),
                    desktop_nav_btn(1, "Transactions", ft.Icons.RECEIPT_LONG_ROUNDED),
                    desktop_nav_btn(2, "Accounts", ft.Icons.ACCOUNT_BALANCE_ROUNDED),
                    desktop_nav_btn(3, "Reports", ft.Icons.INSIGHTS_ROUNDED),
                    desktop_nav_btn(4, "Categories", ft.Icons.CATEGORY_ROUNDED),
                    desktop_nav_btn(5, "Settings", ft.Icons.SETTINGS_ROUNDED),
                ], spacing=4),
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
            ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN, vertical_alignment=ft.CrossAxisAlignment.CENTER)
        else:
            # Compact Mobile Navigation with Dropdown Selector
            nav_dropdown = ft.Dropdown(
                value=str(state["current_tab"]),
                options=[ft.dropdown.Option(key=str(idx), text=label) for idx, label in NAV_ITEMS],
                on_select=lambda e: navigate_to(int(e.control.value)),
                width=135,
                dense=True,
                text_size=12,
                border_color=BORDER,
                border_radius=8,
                bgcolor=CARD,
                content_padding=padding_box(horizontal=10, vertical=6)
            )

            add_btn = ft.IconButton(
                icon=ft.Icons.ADD_ROUNDED,
                bgcolor=BLUE,
                icon_color="#FFFFFF",
                icon_size=18,
                tooltip="Add Transaction",
                on_click=lambda _: open_transaction_dialog(page, on_success_callback=render_current_view)
            )

            header_content = ft.Row([
                brand,
                ft.Row([
                    nav_dropdown,
                    add_btn
                ], spacing=6, vertical_alignment=ft.CrossAxisAlignment.CENTER)
            ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN, vertical_alignment=ft.CrossAxisAlignment.CENTER)

        from utils.responsive import is_mobile_platform
        top_pad = 34 if (mobile and is_mobile_platform(page)) else (8 if mobile else 12)

        return ft.Container(
            header_content,
            padding=ft.Padding(
                left=12 if mobile else 24,
                right=12 if mobile else 24,
                top=top_pad,
                bottom=8 if mobile else 12
            ),
            bgcolor=CARD,
            border=ft.Border(bottom=ft.BorderSide(1, BORDER))
        )

    def update_navigation_chrome():
        mobile = is_mobile(page)
        header_container.content = build_header()
        page.navigation_bar = None
        page.floating_action_button = fab if mobile else None

    # Handle screen resize dynamically
    def on_resize(e):
        update_navigation_chrome()
        render_current_view()

    page.on_resized = on_resize

    # Main App Layout
    page.add(
        ft.Column([
            header_container,
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
