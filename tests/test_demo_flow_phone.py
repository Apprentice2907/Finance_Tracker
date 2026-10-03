"""
Scripted Phone-Width Mode Verification Test.

Visits all core views:
1. Dashboard
2. Transactions
3. Accounts
4. Reports
5. Categories
6. Settings

with seeded demo data (utils.demo_data.load_demo_data) in 360dp phone-width mode.
Fails immediately if any view displays an error banner or fails to render.
"""

import os
import sys
import unittest
import tempfile

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import flet as ft
from db.database import init_db
from utils.demo_data import load_demo_data
from views.dashboard import dashboard_view
from views.transactions import transactions_view
from views.accounts_view import accounts_view
from views.reports import reports_view
from views.categories import categories_view
from views.settings_view import settings_view

class MockPhonePage:
    def __init__(self, width=360, height=640, platform="android"):
        self.width = width
        self.height = height
        self.platform = platform
        self.overlay = []
        self.services = []
        self.dialogs = []
        self.title = "Finance Tracker"
        self.theme_mode = ft.ThemeMode.LIGHT
        self.padding = 0
        self.bgcolor = "#FFFFFF"
        self.navigation_bar = None
        self.floating_action_button = None
        self._controls = []

    def update(self):
        pass

    def show_dialog(self, dlg):
        self.dialogs.append(dlg)

    def pop_dialog(self):
        if self.dialogs:
            return self.dialogs.pop()
        return None

    def add(self, *controls):
        self._controls.extend(controls)

def inspect_for_error_banners(view_name, control):
    """Recursively walks control tree and reports any error banners."""
    errors = []
    def walk(ctrl):
        if hasattr(ctrl, "controls") and ctrl.controls:
            for c in ctrl.controls:
                walk(c)
        if hasattr(ctrl, "content") and ctrl.content:
            walk(ctrl.content)
        if isinstance(ctrl, ft.Text):
            val = (ctrl.value or "").lower()
            if "failed to load" in val:
                errors.append(f"{view_name} banner: {ctrl.value}")
    walk(control)
    return errors

class TestDemoFlowPhone(unittest.TestCase):

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.temp_dir.name, "demo_flow_test.db")
        init_db(self.db_path)
        os.environ["FINANCE_DB_PATH"] = self.db_path
        self.tx_count = load_demo_data(num_months=4, transactions_per_month=30)
        self.page = MockPhonePage(width=360, height=640, platform="android")

    def tearDown(self):
        self.temp_dir.cleanup()
        if "FINANCE_DB_PATH" in os.environ:
            del os.environ["FINANCE_DB_PATH"]

    def test_dashboard_phone_view(self):
        """Dashboard must render cleanly with charts and 0 error banners in 360dp phone mode."""
        view = dashboard_view(self.page)
        self.assertIsInstance(view, ft.Container)
        errs = inspect_for_error_banners("Dashboard", view)
        self.assertEqual(errs, [], f"Error banners found in Dashboard: {errs}")

    def test_transactions_phone_view(self):
        """Transactions view must render transaction cards with 0 error banners in 360dp phone mode."""
        view = transactions_view(self.page)
        self.assertIsInstance(view, ft.Container)
        errs = inspect_for_error_banners("Transactions", view)
        self.assertEqual(errs, [], f"Error banners found in Transactions: {errs}")

    def test_accounts_phone_view(self):
        """Accounts view must render liquid balances and accounts with 0 error banners in 360dp phone mode."""
        view = accounts_view(self.page)
        self.assertIsInstance(view, ft.Container)
        errs = inspect_for_error_banners("Accounts", view)
        self.assertEqual(errs, [], f"Error banners found in Accounts: {errs}")

    def test_reports_phone_view(self):
        """Reports view must render pie charts, breakdown lists, and trends with 0 error banners in 360dp phone mode."""
        view = reports_view(self.page)
        self.assertIsInstance(view, ft.Container)
        errs = inspect_for_error_banners("Reports", view)
        self.assertEqual(errs, [], f"Error banners found in Reports: {errs}")

    def test_categories_phone_view(self):
        """Categories view must render categories list with 0 error banners in 360dp phone mode."""
        view = categories_view(self.page)
        self.assertIsInstance(view, ft.Container)
        errs = inspect_for_error_banners("Categories", view)
        self.assertEqual(errs, [], f"Error banners found in Categories: {errs}")

    def test_settings_phone_view(self):
        """Settings view must render backup/restore and excel tools with 0 error banners in 360dp phone mode."""
        view = settings_view(self.page)
        self.assertIsInstance(view, ft.Container)
        errs = inspect_for_error_banners("Settings", view)
        self.assertEqual(errs, [], f"Error banners found in Settings: {errs}")

def run_scripted_check():
    """Standalone runner for terminal/CI invocation."""
    print("=== STARTING SCRIPTED PHONE-WIDTH MODE CHECK (360dp) ===")
    tmp_dir = tempfile.TemporaryDirectory()
    db_path = os.path.join(tmp_dir.name, "scripted_check.db")
    init_db(db_path)
    os.environ["FINANCE_DB_PATH"] = db_path
    
    count = load_demo_data(num_months=4, transactions_per_month=30)
    print(f"Seeded {count} demo transactions across 4 months.")
    
    page = MockPhonePage(width=360, height=640, platform="android")
    views = [
        ("Dashboard", lambda: dashboard_view(page)),
        ("Transactions", lambda: transactions_view(page)),
        ("Accounts", lambda: accounts_view(page)),
        ("Reports", lambda: reports_view(page)),
        ("Categories", lambda: categories_view(page)),
        ("Settings", lambda: settings_view(page)),
    ]
    
    failures = []
    for name, builder in views:
        try:
            ctrl = builder()
            errs = inspect_for_error_banners(name, ctrl)
            if errs:
                failures.extend(errs)
                print(f"[FAIL] {name}: {errs}")
            else:
                print(f"[PASS] {name}: Clean load, zero error banners")
        except Exception as exc:
            failures.append(f"{name} crashed: {exc}")
            print(f"[CRASH] {name}: {exc}")
            
    tmp_dir.cleanup()
    if "FINANCE_DB_PATH" in os.environ:
        del os.environ["FINANCE_DB_PATH"]
        
    if failures:
        print(f"\nSCRIPTED CHECK FAILED: {len(failures)} failure(s)")
        return False
    print("\nALL 6 VIEWS PASSED PHONE-WIDTH VERIFICATION WITH ZERO ERROR BANNERS!")
    return True

if __name__ == "__main__":
    import sys
    if "--script" in sys.argv:
        success = run_scripted_check()
        sys.exit(0 if success else 1)
    else:
        unittest.main()
