"""
UI and Chart Zero-Data Edge Case Tests.

Verifies that charts, summaries, and widgets render cleanly without exceptions
even when the database is completely empty or all category amounts are zero.
"""

import os
import unittest
import tempfile
import flet as ft
from db.database import init_db
from charts.category_pie import build_category_pie
from charts.cashflow_chart import build_cashflow_chart

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

    def test_category_pie_empty_db(self):
        """Pie chart must return clean empty container without 'All wedge sizes are zero' exception."""
        widget = build_category_pie(selected_type="expense", start_date="2026-08-01", end_date="2026-08-31", is_mobile=False)
        self.assertIsInstance(widget, ft.Container)

    def test_cashflow_chart_empty_db(self):
        """Cashflow chart must render cleanly even when monthly totals are all zero."""
        widget = build_cashflow_chart(selected_type="expense", year=2026, is_mobile=False)
        self.assertIsInstance(widget, ft.Image)

if __name__ == "__main__":
    unittest.main()
