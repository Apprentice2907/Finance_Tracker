import flet as ft
from db.transactions import get_totals
from charts.cashflow_chart import build_cashflow_chart
from charts.category_pie import build_category_pie

def dashboard_view():
    totals = get_totals()
    income = totals.get("income", 0)
    expense = totals.get("expense", 0)
    balance = income - expense

    return ft.Column([
        ft.Text("Dashboard", size=24, weight=ft.FontWeight.BOLD),
        ft.Row([
            ft.Container(content=ft.Column([ft.Text("Income"), ft.Text(f"₹{income}", size=20, color=ft.Colors.GREEN)]),
                         padding=20, bgcolor=ft.Colors.GREY_900, border_radius=10),
            ft.Container(content=ft.Column([ft.Text("Expense"), ft.Text(f"₹{expense}", size=20, color=ft.Colors.RED)]),
                         padding=20, bgcolor=ft.Colors.GREY_900, border_radius=10),
            ft.Container(content=ft.Column([ft.Text("Balance"), ft.Text(f"₹{balance}", size=20)]),
                         padding=20, bgcolor=ft.Colors.GREY_900, border_radius=10),
        ]),
        ft.Container(content=build_cashflow_chart(), height=300),
        ft.Container(content=build_category_pie(), height=300),
    ])
