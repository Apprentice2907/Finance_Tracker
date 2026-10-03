"""
UI and Chart Zero-Data Edge Case & Data Regression Tests.

Verifies that charts, summaries, and widgets render cleanly without exceptions
both when the database is completely empty and when populated with realistic
multi-month, multi-category transactions.
All tests construct real flet and flet_charts controls (not mocks).
"""

import os
import sys
import unittest
import tempfile

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import flet as ft
from flet_charts import BarChart, PieChart
from db.database import init_db
from db.categories import add_category
from db.transactions import add_transaction
from charts.category_pie import build_category_pie
from charts.cashflow_chart import build_cashflow_chart
from views.dashboard import dashboard_view
from views.reports import reports_view

class MockHostPage:
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

    def update(self):
        pass

    def show_dialog(self, dlg):
        self.dialogs.append(dlg)

    def pop_dialog(self):
        if self.dialogs:
            return self.dialogs.pop()
        return None

def _find_error_banners(control):
    found = []
    def walk(ctrl):
        if hasattr(ctrl, "controls") and ctrl.controls:
            for c in ctrl.controls:
                walk(c)
        if hasattr(ctrl, "content") and ctrl.content:
            walk(ctrl.content)
        if isinstance(ctrl, ft.Text):
            txt = (ctrl.value or "").lower()
            if "failed to load" in txt:
                found.append(ctrl.value)
    walk(control)
    return found

class TestChartEdgeCases(unittest.TestCase):

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.temp_dir.name, "empty_chart_test.db")
        init_db(self.db_path)
        os.environ["FINANCE_DB_PATH"] = self.db_path

    def tearDown(self):
        self.temp_dir.cleanup()
        if "FINANCE_DB_PATH" in os.environ:
            del os.environ["FINANCE_DB_PATH"]

    def _seed_sample_data(self):
        c1 = add_category("Groceries", "expense", "#6FA8DC")
        c2 = add_category("Rent & Utilities", "expense", "#E58A9B")
        c3 = add_category("Entertainment", "expense", "#D9A65D")
        c4 = add_category("Salary", "income", "#65AF9A")
        c5 = add_category("Freelance", "income", "#4ECDC4")

        # 6 months of data
        for m in range(1, 7):
            d = f"2026-{m:02d}-10"
            add_transaction("expense", 450.0 * m, c1, d, "Weekly groceries")
            add_transaction("expense", 1200.0, c2, d, "Monthly rent")
            add_transaction("expense", 150.0 * m, c3, d, "Movies and fun")
            add_transaction("income", 4000.0, c4, d, "Primary salary")
            add_transaction("income", 800.0 * m, c5, d, "Project invoice")

    def test_category_pie_empty_db(self):
        """Pie chart must return clean empty container without 'All wedge sizes are zero' exception."""
        widget = build_category_pie(selected_type="expense", start_date="2026-08-01", end_date="2026-08-31", is_mobile=False)
        self.assertIsInstance(widget, ft.Container)

    def test_cashflow_chart_empty_db(self):
        """Cashflow chart must render cleanly even when monthly totals are all zero."""
        widget = build_cashflow_chart(selected_type="expense", year=2026, is_mobile=False)
        self.assertIsInstance(widget, BarChart)

    def test_category_pie_with_data_constructs_real_pie(self):
        """Pie chart with data must construct real PieChart control without unsupported tooltip arg."""
        self._seed_sample_data()

        # Desktop expense pie
        widget_desktop = build_category_pie(selected_type="expense", start_date="2026-01-01", end_date="2026-12-31", is_mobile=False)
        self.assertIsInstance(widget_desktop, ft.Container)
        # Check that it contains real Stack with PieChart
        stack = widget_desktop.content
        self.assertIsInstance(stack, ft.Stack)
        pie_control = stack.controls[0]
        self.assertIsInstance(pie_control, PieChart)
        self.assertGreater(len(pie_control.sections), 0)

        # Mobile income pie
        widget_mobile = build_category_pie(selected_type="income", start_date="2026-01-01", end_date="2026-12-31", is_mobile=True)
        self.assertIsInstance(widget_mobile, ft.Container)
        pie_mobile = widget_mobile.content.controls[0]
        self.assertIsInstance(pie_mobile, PieChart)

        # With legend enabled
        widget_legend = build_category_pie(selected_type="expense", start_date="2026-01-01", end_date="2026-12-31", is_mobile=True, show_legend=True)
        self.assertIsInstance(widget_legend, ft.Column)

    def test_cashflow_chart_with_data_constructs_real_barchart(self):
        """Cashflow chart with multi-month data must construct real BarChart control."""
        self._seed_sample_data()

        # Expense chart
        chart_exp = build_cashflow_chart(selected_type="expense", year=2026, is_mobile=False)
        self.assertIsInstance(chart_exp, BarChart)
        self.assertEqual(len(chart_exp.groups), 12)
        # Verify 6th month rod height is > 0
        group_6 = chart_exp.groups[5]
        self.assertGreater(group_6.rods[0].to_y, 0)

        # Mobile income chart
        chart_inc = build_cashflow_chart(selected_type="income", year=2026, is_mobile=True)
        self.assertIsInstance(chart_inc, BarChart)
        self.assertEqual(len(chart_inc.groups), 12)

    def test_dashboard_view_empty_and_populated_no_error_banners(self):
        """Dashboard view must build cleanly with real controls and 0 error banners in both empty and populated states."""
        page = MockHostPage(width=360, platform="android")

        # 1. Empty DB
        dash_empty = dashboard_view(page)
        self.assertIsInstance(dash_empty, ft.Container)
        errs_empty = _find_error_banners(dash_empty)
        self.assertEqual(errs_empty, [], f"Dashboard showed error banners on empty DB: {errs_empty}")

        # 2. Populated DB
        self._seed_sample_data()
        dash_populated = dashboard_view(page)
        self.assertIsInstance(dash_populated, ft.Container)
        errs_pop = _find_error_banners(dash_populated)
        self.assertEqual(errs_pop, [], f"Dashboard showed error banners with real data: {errs_pop}")

    def test_reports_view_empty_and_populated_no_error_banners(self):
        """Reports view must build cleanly with real controls and 0 error banners in both empty and populated states."""
        page = MockHostPage(width=360, platform="android")

        # 1. Empty DB
        rep_empty = reports_view(page)
        self.assertIsInstance(rep_empty, ft.Container)
        errs_empty = _find_error_banners(rep_empty)
        self.assertEqual(errs_empty, [], f"Reports showed error banners on empty DB: {errs_empty}")

        # 2. Populated DB
        self._seed_sample_data()
        rep_populated = reports_view(page)
        self.assertIsInstance(rep_populated, ft.Container)
        errs_pop = _find_error_banners(rep_populated)
        self.assertEqual(errs_pop, [], f"Reports showed error banners with real data: {errs_pop}")

if __name__ == "__main__":
    unittest.main()
