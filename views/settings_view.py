import os
import datetime
import flet as ft

from utils.responsive import (
    BG, CARD, TEXT, MUTED, BORDER, BLUE, GREEN, RED, AMBER,
    is_mobile, padding_box, card_border, soft_color
)
from utils.exports import export_to_excel, parse_and_import_excel
from utils.backup import create_database_backup, restore_database_from_backup
from db.database import get_db_path

def settings_view(page: ft.Page, on_data_restored_callback=None):
    root = ft.Column(spacing=18, scroll=ft.ScrollMode.AUTO, expand=True)

    def make_card(content, padding=18):
        return ft.Container(
            content,
            padding=padding,
            bgcolor=CARD,
            border=card_border(),
            border_radius=14
        )

    # State for import duplicate skipping
    skip_dups_checkbox = ft.Checkbox(label="Skip duplicate transactions during import", value=True)

    # Register FilePicker in page.services (Flet Service pattern)
    file_picker = None
    for s in page.services:
        if isinstance(s, ft.FilePicker):
            file_picker = s
            break
    if file_picker is None:
        file_picker = ft.FilePicker()
        page.services.append(file_picker)

    # --- Helper Modal Alerts ---
    def show_alert(title, message, is_success=True):
        dialog = ft.AlertDialog(
            modal=True,
            bgcolor=CARD,
            title=ft.Row([
                ft.Icon(ft.Icons.CHECK_CIRCLE_ROUNDED if is_success else ft.Icons.ERROR_OUTLINE_ROUNDED, color=GREEN if is_success else RED, size=20),
                ft.Text(title, weight=ft.FontWeight.BOLD, color=TEXT, size=16),
            ], spacing=8),
            content=ft.Container(ft.Text(message, size=13, color=TEXT), width=380),
            actions=[
                ft.ElevatedButton("OK", on_click=lambda _: page.pop_dialog(), style=ft.ButtonStyle(bgcolor=BLUE, color="#FFFFFF"))
            ]
        )
        page.show_dialog(dialog)

    def show_import_summary(result):
        err_controls = []
        if result["errors"]:
            err_controls.append(ft.Text("Validation Issues:", weight=ft.FontWeight.BOLD, size=12, color=RED))
            for row_num, err_msg in result["errors"][:8]:
                err_controls.append(ft.Text(f"• Row {row_num}: {err_msg}", size=11, color=MUTED))
            if len(result["errors"]) > 8:
                err_controls.append(ft.Text(f"... and {len(result['errors']) - 8} more row issues.", size=11, color=MUTED))

        dialog = ft.AlertDialog(
            modal=True,
            bgcolor=CARD,
            title=ft.Row([
                ft.Icon(ft.Icons.TASK_ALT_ROUNDED if result["success"] else ft.Icons.WARNING_AMBER_ROUNDED, color=GREEN if result["success"] else RED, size=20),
                ft.Text("Import Summary", weight=ft.FontWeight.BOLD, color=TEXT, size=16),
            ], spacing=8),
            content=ft.Container(
                ft.Column([
                    ft.Text(result["message"], weight=ft.FontWeight.W_500, size=13, color=TEXT),
                    ft.Row([
                        ft.Container(ft.Column([ft.Text("Total Rows", size=10, color=MUTED), ft.Text(str(result["total_rows"]), size=14, weight=ft.FontWeight.BOLD, color=TEXT)]), padding=8, bgcolor="#F4F6F9", border_radius=6, expand=True),
                        ft.Container(ft.Column([ft.Text("Imported", size=10, color=MUTED), ft.Text(str(result["imported"]), size=14, weight=ft.FontWeight.BOLD, color=GREEN)]), padding=8, bgcolor=soft_color(GREEN), border_radius=6, expand=True),
                        ft.Container(ft.Column([ft.Text("Skipped", size=10, color=MUTED), ft.Text(str(result["skipped_duplicates"]), size=14, weight=ft.FontWeight.BOLD, color=AMBER)]), padding=8, bgcolor=soft_color(AMBER), border_radius=6, expand=True),
                    ], spacing=8),
                    ft.Column(err_controls, spacing=3) if err_controls else ft.Container(),
                ], spacing=12, tight=True, scroll=ft.ScrollMode.AUTO),
                width=400
            ),
            actions=[
                ft.ElevatedButton("Done", on_click=lambda _: page.pop_dialog(), style=ft.ButtonStyle(bgcolor=BLUE, color="#FFFFFF"))
            ]
        )
        page.show_dialog(dialog)

    # --- 1. Export Excel Handler ---
    async def trigger_export_excel(_):
        ts = datetime.datetime.now().strftime("%Y%m%d_%H%M")
        try:
            dest = await file_picker.save_file(
                dialog_title="Export Transactions to Excel",
                file_name=f"finance_tracker_{ts}.xlsx",
                allowed_extensions=["xlsx"]
            )
            if dest:
                if not dest.endswith(".xlsx"):
                    dest += ".xlsx"
                export_to_excel(dest, period_label="Complete Financial History")
                show_alert("Export Successful", f"Transactions exported successfully to:\n{dest}", is_success=True)
        except Exception as ex:
            show_alert("Export Failed", f"Could not export file: {str(ex)}", is_success=False)

    # --- 2. Import Excel Handler ---
    async def trigger_import_excel(_):
        try:
            files = await file_picker.pick_files(
                dialog_title="Select Excel File to Import",
                allowed_extensions=["xlsx"],
                allow_multiple=False
            )
            if files and len(files) > 0:
                picked_file = files[0]
                if picked_file.path:
                    result = parse_and_import_excel(picked_file.path, skip_duplicates=skip_dups_checkbox.value)
                    show_import_summary(result)
                    if result["success"] and on_data_restored_callback:
                        on_data_restored_callback()
        except Exception as ex:
            show_alert("Import Failed", f"An unexpected error occurred: {str(ex)}", is_success=False)

    # --- 3. Backup Database Handler ---
    async def trigger_backup_db(_):
        ts = datetime.datetime.now().strftime("%Y%m%d_%H%M")
        try:
            dest = await file_picker.save_file(
                dialog_title="Save Database Backup",
                file_name=f"finance_backup_{ts}.db",
                allowed_extensions=["db"]
            )
            if dest:
                if not dest.endswith(".db"):
                    dest += ".db"
                create_database_backup(dest)
                show_alert("Backup Complete", f"SQLite database backup saved to:\n{dest}", is_success=True)
        except Exception as ex:
            show_alert("Backup Failed", f"Could not create database backup: {str(ex)}", is_success=False)

    # --- 4. Restore Database Handler ---
    async def trigger_restore_db(_):
        try:
            files = await file_picker.pick_files(
                dialog_title="Select SQLite Backup File (.db)",
                allowed_extensions=["db"],
                allow_multiple=False
            )
            if files and len(files) > 0:
                picked_file = files[0]
                if picked_file.path:
                    confirm_restore(picked_file.path)
        except Exception as ex:
            show_alert("Restore Failed", f"Could not open backup file: {str(ex)}", is_success=False)

    def confirm_restore(backup_path):
        def proceed_restore(_):
            page.pop_dialog()
            ok, msg = restore_database_from_backup(backup_path)
            show_alert("Database Restore", msg, is_success=ok)
            if ok and on_data_restored_callback:
                on_data_restored_callback()

        dialog = ft.AlertDialog(
            modal=True,
            bgcolor=CARD,
            title=ft.Text("Confirm Database Restore", weight=ft.FontWeight.BOLD, color=RED, size=17),
            content=ft.Text(
                "Restoring will overwrite your current active database with the backup file.\n\nAre you sure you want to proceed?",
                size=13,
                color=TEXT
            ),
            actions=[
                ft.TextButton("Cancel", on_click=lambda _: page.pop_dialog(), style=ft.ButtonStyle(color=MUTED)),
                ft.ElevatedButton("Overwrite & Restore", on_click=proceed_restore, style=ft.ButtonStyle(bgcolor=RED, color="#FFFFFF")),
            ]
        )
        page.show_dialog(dialog)

    # --- UI Layout ---
    mobile = is_mobile(page)

    header = ft.Row([
        ft.Column([
            ft.Text("Settings & Backup", size=20 if mobile else 22, weight=ft.FontWeight.BOLD, color=TEXT),
            ft.Text("Data management, Excel synchronization, and database backups", color=MUTED, size=12),
        ], spacing=2)
    ])

    # --- CSV Export Handler ---
    async def trigger_export_csv(_):
        from utils.exports import export_to_csv
        ts = datetime.datetime.now().strftime("%Y%m%d_%H%M")
        try:
            dest = await file_picker.save_file(
                dialog_title="Export Transactions to CSV",
                file_name=f"finance_tracker_{ts}.csv",
                allowed_extensions=["csv"]
            )
            if dest:
                if not dest.endswith(".csv"):
                    dest += ".csv"
                export_to_csv(dest)
                show_alert("CSV Export Successful", f"Saved transactions to:\n{dest}", is_success=True)
        except Exception as e:
            show_alert("Export Failed", f"Could not export CSV: {str(e)}", is_success=False)

    # --- DB Health Check Handler ---
    def trigger_health_check(_):
        from db.health import check_database_health
        health = check_database_health()
        if health["status"] == "PASS":
            show_alert("Database Health: PASS", "SQLite page integrity, foreign keys, indexes, and aggregate consistency are 100% healthy.", is_success=True)
        else:
            err_text = "\n• ".join(health["errors"] + health["warnings"])
            guidance_text = "\n• ".join(health["recovery_guidance"])
            show_alert(f"Database Health: {health['status']}", f"Issues detected:\n• {err_text}\n\nRecovery Guidance:\n• {guidance_text}", is_success=False)

    # --- Developer Diagnostics Modal ---
    def open_diagnostics_modal(_):
        from views.performance_view import performance_view
        diag_dialog = ft.AlertDialog(
            modal=True,
            bgcolor=CARD,
            title=ft.Row([
                ft.Icon(ft.Icons.ANALYTICS_OUTLINED, color=BLUE, size=22),
                ft.Text("Developer Performance Diagnostics", weight=ft.FontWeight.BOLD, color=TEXT, size=16),
            ], spacing=8),
            content=ft.Container(
                performance_view(page),
                width=650,
                height=480
            ),
            actions=[
                ft.ElevatedButton("Close", on_click=lambda _: page.pop_dialog(), style=ft.ButtonStyle(bgcolor=BLUE, color="#FFFFFF"))
            ]
        )
        page.show_dialog(diag_dialog)

    excel_card = make_card(
        ft.Column([
            ft.Row([
                ft.Icon(ft.Icons.TABLE_CHART_OUTLINED, color=GREEN, size=20),
                ft.Text("Data Export & Synchronization", size=15, weight=ft.FontWeight.BOLD, color=TEXT),
            ], spacing=8),
            ft.Text("Export your financial history to formatted Excel (.xlsx) or standard CSV, or import previous statements.", size=12, color=MUTED),
            skip_dups_checkbox,
            ft.Row([
                ft.ElevatedButton(
                    "Export to Excel",
                    icon=ft.Icons.DOWNLOAD_ROUNDED,
                    on_click=trigger_export_excel,
                    style=ft.ButtonStyle(bgcolor=GREEN, color="#FFFFFF", shape=ft.RoundedRectangleBorder(radius=8))
                ),
                ft.OutlinedButton(
                    "Export to CSV",
                    icon=ft.Icons.FILE_DOWNLOAD_OUTLINED,
                    on_click=trigger_export_csv,
                    style=ft.ButtonStyle(color=TEXT, side=ft.BorderSide(1, BORDER), shape=ft.RoundedRectangleBorder(radius=8))
                ),
                ft.OutlinedButton(
                    "Import Excel",
                    icon=ft.Icons.UPLOAD_FILE_ROUNDED,
                    on_click=trigger_import_excel,
                    style=ft.ButtonStyle(color=BLUE, side=ft.BorderSide(1, "#C9D8F8"), shape=ft.RoundedRectangleBorder(radius=8))
                ),
            ], spacing=10, wrap=True)
        ], spacing=12)
    )

    backup_card = make_card(
        ft.Column([
            ft.Row([
                ft.Icon(ft.Icons.STORAGE_ROUNDED, color=BLUE, size=20),
                ft.Text("Local Database Backup & Restore", size=15, weight=ft.FontWeight.BOLD, color=TEXT),
            ], spacing=8),
            ft.Text("Create an atomic snapshot of your SQLite database with SHA-256 verification or restore safely.", size=12, color=MUTED),
            ft.Text(f"Current DB Path: {get_db_path()}", size=11, color=MUTED, italic=True),
            ft.Row([
                ft.ElevatedButton(
                    "Backup Database",
                    icon=ft.Icons.BACKUP_ROUNDED,
                    on_click=trigger_backup_db,
                    style=ft.ButtonStyle(bgcolor=BLUE, color="#FFFFFF", shape=ft.RoundedRectangleBorder(radius=8))
                ),
                ft.OutlinedButton(
                    "Restore Database",
                    icon=ft.Icons.RESTORE_ROUNDED,
                    on_click=trigger_restore_db,
                    style=ft.ButtonStyle(color=RED, side=ft.BorderSide(1, "#F8C9CF"), shape=ft.RoundedRectangleBorder(radius=8))
                ),
                ft.OutlinedButton(
                    "Self-Health Check",
                    icon=ft.Icons.HEALTH_AND_SAFETY_OUTLINED,
                    on_click=trigger_health_check,
                    style=ft.ButtonStyle(color=GREEN, side=ft.BorderSide(1, "#C9EAD8"), shape=ft.RoundedRectangleBorder(radius=8))
                ),
            ], spacing=10, wrap=True)
        ], spacing=12)
    )

    dev_card = make_card(
        ft.Column([
            ft.Row([
                ft.Icon(ft.Icons.BUG_REPORT_OUTLINED, color=AMBER, size=18),
                ft.Text("Developer & Systems Diagnostics", size=14, weight=ft.FontWeight.BOLD, color=TEXT),
            ], spacing=8),
            ft.Text("Internal SQLite WAL state, query latencies, cache hit rates, memory metrics, and JSON diagnostics export.", size=12, color=MUTED),
            ft.OutlinedButton(
                "Open Diagnostics Dashboard",
                icon=ft.Icons.ANALYTICS_OUTLINED,
                on_click=open_diagnostics_modal,
                style=ft.ButtonStyle(color=TEXT, side=ft.BorderSide(1, BORDER), shape=ft.RoundedRectangleBorder(radius=8))
            )
        ], spacing=10)
    )

    about_card = make_card(
        ft.Column([
            ft.Row([
                ft.Icon(ft.Icons.INFO_OUTLINE_ROUNDED, color=MUTED, size=18),
                ft.Text("About Finance Tracker", size=14, weight=ft.FontWeight.BOLD, color=TEXT),
            ], spacing=8),
            ft.Text("Version 2.0 (Personal Edition for Android & Desktop)\nBuilt with Python & Flet. 100% offline, private, and local-first.", size=12, color=MUTED)
        ], spacing=6)
    )

    root.controls = [
        header,
        excel_card,
        backup_card,
        dev_card,
        about_card,
    ]

    pad_h = 12 if mobile else 28
    pad_v = 14 if mobile else 24
    return ft.Container(root, padding=padding_box(pad_h, pad_v), expand=True, bgcolor=BG)
