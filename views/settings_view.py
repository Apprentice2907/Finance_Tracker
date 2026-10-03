import os
import tempfile
import datetime
import flet as ft

from utils.responsive import (
    BG, CARD, TEXT, MUTED, BORDER, BLUE, GREEN, RED, AMBER,
    is_mobile, padding_box, card_border, soft_color, show_snackbar
)
from utils.exports import export_to_excel, parse_and_import_excel
from utils.backup import create_database_backup, restore_database_from_backup
from db.database import get_db_path

def settings_view(page: ft.Page, on_data_restored_callback=None):
    root = ft.Column(spacing=18, scroll=ft.ScrollMode.AUTO, expand=True)

    try:
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

        # Register FilePicker via page.services — the official Flet Service pattern
        file_picker = None
        for s in page.services:
            if isinstance(s, ft.FilePicker):
                file_picker = s
                break
        if file_picker is None:
            file_picker = ft.FilePicker()
            page.services.append(file_picker)
            page.update()

        # --- Helper Modal Alerts ---
        def show_alert(title, message, is_success=True):
            page_w = page.width if (page and page.width) else 360
            alert_w = 380 if not is_mobile(page) else min(320, page_w - 36)
            dialog = ft.AlertDialog(
                modal=True,
                bgcolor=CARD,
                title=ft.Row([
                    ft.Icon(ft.Icons.CHECK_CIRCLE_ROUNDED if is_success else ft.Icons.ERROR_OUTLINE_ROUNDED, color=GREEN if is_success else RED, size=20),
                    ft.Text(title, weight=ft.FontWeight.BOLD, color=TEXT, size=16),
                ], spacing=8),
                content=ft.Container(ft.Text(message, size=13, color=TEXT), width=alert_w),
                actions=[
                    ft.ElevatedButton(
                        "OK",
                        on_click=lambda _: page.pop_dialog(),
                        style=ft.ButtonStyle(bgcolor=BLUE, color="#FFFFFF", padding=padding_box(16, 12), shape=ft.RoundedRectangleBorder(radius=8))
                    )
                ]
            )
            page.show_dialog(dialog)

        def show_import_summary(result):
            page_w = page.width if (page and page.width) else 360
            summary_w = 400 if not is_mobile(page) else min(320, page_w - 36)

            err_controls = []
            if result.get("errors"):
                err_controls.append(ft.Text("Validation Issues:", weight=ft.FontWeight.BOLD, size=12, color=RED))
                for row_num, err_msg in result["errors"][:8]:
                    err_controls.append(ft.Text(f"• Row {row_num}: {err_msg}", size=11, color=MUTED))
                if len(result["errors"]) > 8:
                    err_controls.append(ft.Text(f"... and {len(result['errors']) - 8} more row issues.", size=11, color=MUTED))

            dialog = ft.AlertDialog(
                modal=True,
                bgcolor=CARD,
                title=ft.Row([
                    ft.Icon(ft.Icons.TASK_ALT_ROUNDED if result.get("success") else ft.Icons.WARNING_AMBER_ROUNDED, color=GREEN if result.get("success") else RED, size=20),
                    ft.Text("Import Summary", weight=ft.FontWeight.BOLD, color=TEXT, size=16),
                ], spacing=8),
                content=ft.Container(
                    ft.Column([
                        ft.Text(result.get("message", "Import complete"), weight=ft.FontWeight.W_500, size=13, color=TEXT),
                        ft.Row([
                            ft.Container(ft.Column([ft.Text("Total Rows", size=10, color=MUTED), ft.Text(str(result.get("total_rows", 0)), size=14, weight=ft.FontWeight.BOLD, color=TEXT)]), padding=8, bgcolor="#F4F6F9", border_radius=6, expand=True),
                            ft.Container(ft.Column([ft.Text("Imported", size=10, color=MUTED), ft.Text(str(result.get("imported", 0)), size=14, weight=ft.FontWeight.BOLD, color=GREEN)]), padding=8, bgcolor=soft_color(GREEN), border_radius=6, expand=True),
                            ft.Container(ft.Column([ft.Text("Skipped", size=10, color=MUTED), ft.Text(str(result.get("skipped_duplicates", 0)), size=14, weight=ft.FontWeight.BOLD, color=AMBER)]), padding=8, bgcolor=soft_color(AMBER), border_radius=6, expand=True),
                        ], spacing=8),
                        ft.Column(err_controls, spacing=3) if err_controls else ft.Container(),
                    ], spacing=12, tight=True, scroll=ft.ScrollMode.AUTO),
                    width=summary_w
                ),
                actions=[
                    ft.ElevatedButton(
                        "Done",
                        on_click=lambda _: page.pop_dialog(),
                        style=ft.ButtonStyle(bgcolor=BLUE, color="#FFFFFF", padding=padding_box(16, 12), shape=ft.RoundedRectangleBorder(radius=8))
                    )
                ]
            )
            page.show_dialog(dialog)

        # --- 1. Export Excel Handler ---
        async def trigger_export_excel(_):
            ts = datetime.datetime.now().strftime("%Y%m%d_%H%M")
            tmp_path = None
            try:
                with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
                    tmp_path = tmp.name
                export_to_excel(tmp_path, period_label="Complete Financial History")
                with open(tmp_path, "rb") as f:
                    excel_bytes = f.read()

                dest = await file_picker.save_file(
                    dialog_title="Export Transactions to Excel",
                    file_name=f"finance_tracker_{ts}.xlsx",
                    allowed_extensions=["xlsx"],
                    src_bytes=excel_bytes
                )
                if dest is None:
                    # User cancelled
                    return
                if not dest.endswith(".xlsx"):
                    dest += ".xlsx"
                if not os.path.exists(dest) or os.path.getsize(dest) == 0:
                    with open(dest, "wb") as f:
                        f.write(excel_bytes)
                show_alert("Export Successful", f"Transactions exported successfully to:\n{dest}", is_success=True)
                show_snackbar(page, "Transactions exported to Excel")
            except PermissionError as pe:
                show_alert("Export Failed", f"Permission denied saving to destination: {str(pe)}", is_success=False)
            except Exception as ex:
                show_alert("Export Failed", f"Could not export file: {str(ex)}", is_success=False)
            finally:
                if tmp_path and os.path.exists(tmp_path):
                    try:
                        os.remove(tmp_path)
                    except Exception:
                        pass

        # --- 2. Import Excel Handler ---
        async def trigger_import_excel(_):
            tmp_path = None
            try:
                files = await file_picker.pick_files(
                    dialog_title="Select Excel File to Import",
                    allowed_extensions=["xlsx"],
                    allow_multiple=False,
                    with_data=True
                )
                if not files or len(files) == 0:
                    # User cancelled
                    return
                picked_file = files[0]
                target_path = None
                if getattr(picked_file, "bytes", None):
                    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
                        tmp.write(picked_file.bytes)
                        tmp_path = tmp.name
                    target_path = tmp_path
                elif getattr(picked_file, "path", None):
                    target_path = picked_file.path

                if not target_path or not os.path.exists(target_path):
                    show_alert("Import Failed", "Selected file could not be read.", is_success=False)
                    return

                result = parse_and_import_excel(target_path, skip_duplicates=skip_dups_checkbox.value)
                show_import_summary(result)
                if result.get("success"):
                    show_snackbar(page, f"Imported {result.get('imported', 0)} transactions")
                    if on_data_restored_callback:
                        on_data_restored_callback()
            except PermissionError as pe:
                show_alert("Import Failed", f"Permission denied reading file: {str(pe)}", is_success=False)
            except Exception as ex:
                show_alert("Import Failed", f"An unexpected error occurred: {str(ex)}", is_success=False)
            finally:
                if tmp_path and os.path.exists(tmp_path):
                    try:
                        os.remove(tmp_path)
                    except Exception:
                        pass

        # --- 3. Backup Database Handler ---
        async def trigger_backup_db(_):
            ts = datetime.datetime.now().strftime("%Y%m%d_%H%M")
            try:
                source_db = get_db_path()
                if not os.path.exists(source_db):
                    show_alert("Backup Failed", "Active database file not found.", is_success=False)
                    return
                with open(source_db, "rb") as f:
                    db_bytes = f.read()

                dest = await file_picker.save_file(
                    dialog_title="Save Database Backup",
                    file_name=f"finance_backup_{ts}.db",
                    allowed_extensions=["db"],
                    src_bytes=db_bytes
                )
                if dest is None:
                    # User cancelled
                    return
                if not dest.endswith(".db"):
                    dest += ".db"
                if not os.path.exists(dest) or os.path.getsize(dest) == 0:
                    create_database_backup(dest)
                show_alert("Backup Complete", f"SQLite database backup saved to:\n{dest}", is_success=True)
                show_snackbar(page, "Database backup saved successfully")
            except PermissionError as pe:
                show_alert("Backup Failed", f"Permission denied saving backup: {str(pe)}", is_success=False)
            except Exception as ex:
                show_alert("Backup Failed", f"Could not create database backup: {str(ex)}", is_success=False)

        # --- 4. Restore Database Handler ---
        async def trigger_restore_db(_):
            try:
                files = await file_picker.pick_files(
                    dialog_title="Select SQLite Backup File (.db)",
                    allowed_extensions=["db"],
                    allow_multiple=False,
                    with_data=True
                )
                if not files or len(files) == 0:
                    # User cancelled
                    return
                picked_file = files[0]
                target_path = None
                if getattr(picked_file, "bytes", None):
                    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
                        tmp.write(picked_file.bytes)
                        target_path = tmp.name
                elif getattr(picked_file, "path", None):
                    target_path = picked_file.path

                if not target_path or not os.path.exists(target_path):
                    show_alert("Restore Failed", "Selected backup file could not be read.", is_success=False)
                    return

                confirm_restore(target_path)
            except PermissionError as pe:
                show_alert("Restore Failed", f"Permission denied reading backup file: {str(pe)}", is_success=False)
            except Exception as ex:
                show_alert("Restore Failed", f"Could not open backup file: {str(ex)}", is_success=False)

        def confirm_restore(backup_path):
            def proceed_restore(_):
                page.pop_dialog()
                ok, msg = restore_database_from_backup(backup_path)
                show_alert("Database Restore", msg, is_success=ok)
                if ok:
                    show_snackbar(page, "Database restored successfully")
                    if on_data_restored_callback:
                        on_data_restored_callback()

            page_w = page.width if (page and page.width) else 360
            confirm_w = 380 if not is_mobile(page) else min(320, page_w - 36)

            dialog = ft.AlertDialog(
                modal=True,
                bgcolor=CARD,
                title=ft.Text("Confirm Database Restore", weight=ft.FontWeight.BOLD, color=RED, size=17),
                content=ft.Container(
                    ft.Text(
                        "Restoring will overwrite your current active database with the backup file.\n\nAre you sure you want to proceed?",
                        size=13,
                        color=TEXT
                    ),
                    width=confirm_w
                ),
                actions=[
                    ft.TextButton("Cancel", on_click=lambda _: page.pop_dialog(), style=ft.ButtonStyle(color=MUTED, padding=padding_box(16, 12))),
                    ft.ElevatedButton("Overwrite & Restore", on_click=proceed_restore, style=ft.ButtonStyle(bgcolor=RED, color="#FFFFFF", padding=padding_box(16, 12), shape=ft.RoundedRectangleBorder(radius=8))),
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

        excel_card = make_card(
            ft.Column([
                ft.Row([
                    ft.Icon(ft.Icons.TABLE_VIEW_ROUNDED, color=GREEN, size=20),
                    ft.Text("Excel Spreadsheet Sync", size=15, weight=ft.FontWeight.BOLD, color=TEXT),
                ], spacing=8),
                ft.Text(
                    "Export your complete financial records, category breakdowns, and monthly stats into a styled .xlsx spreadsheet.",
                    size=12, color=MUTED
                ),
                skip_dups_checkbox,
                ft.Row([
                    ft.ElevatedButton(
                        "Export to Excel",
                        icon=ft.Icons.DOWNLOAD_ROUNDED,
                        on_click=trigger_export_excel,
                        style=ft.ButtonStyle(bgcolor=GREEN, color="#FFFFFF", padding=padding_box(16, 12), shape=ft.RoundedRectangleBorder(radius=8))
                    ),
                    ft.OutlinedButton(
                        "Import from Excel",
                        icon=ft.Icons.UPLOAD_FILE_ROUNDED,
                        on_click=trigger_import_excel,
                        style=ft.ButtonStyle(color=TEXT, side=ft.BorderSide(1, BORDER), padding=padding_box(16, 12), shape=ft.RoundedRectangleBorder(radius=8))
                    ),
                ], spacing=10, wrap=True)
            ], spacing=12)
        )

        backup_card = make_card(
            ft.Column([
                ft.Row([
                    ft.Icon(ft.Icons.SETTINGS_BACKUP_RESTORE_ROUNDED, color=BLUE, size=20),
                    ft.Text("SQLite Database Snapshot", size=15, weight=ft.FontWeight.BOLD, color=TEXT),
                ], spacing=8),
                ft.Text(
                    "Create an atomic, verified backup copy of your active SQLite database with SHA-256 integrity verification.",
                    size=12, color=MUTED
                ),
                ft.Row([
                    ft.ElevatedButton(
                        "Backup Database",
                        icon=ft.Icons.SAVE_ROUNDED,
                        on_click=trigger_backup_db,
                        style=ft.ButtonStyle(bgcolor=BLUE, color="#FFFFFF", padding=padding_box(16, 12), shape=ft.RoundedRectangleBorder(radius=8))
                    ),
                    ft.OutlinedButton(
                        "Restore Database",
                        icon=ft.Icons.RESTORE_PAGE_ROUNDED,
                        on_click=trigger_restore_db,
                        style=ft.ButtonStyle(color=GREEN, side=ft.BorderSide(1, "#C9EAD8"), padding=padding_box(16, 12), shape=ft.RoundedRectangleBorder(radius=8))
                    ),
                ], spacing=10, wrap=True)
            ], spacing=12)
        )

        def open_diagnostics_modal(_):
            from views.performance_view import performance_diagnostics_modal
            performance_diagnostics_modal(page)

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
                    style=ft.ButtonStyle(color=TEXT, side=ft.BorderSide(1, BORDER), padding=padding_box(16, 12), shape=ft.RoundedRectangleBorder(radius=8))
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

    except Exception as exc:
        from utils.observability import METRICS
        METRICS.record_error("settings.build", str(exc))
        err_banner = ft.Container(
            ft.Column([
                ft.Row([
                    ft.Icon(ft.Icons.ERROR_OUTLINE_ROUNDED, color=RED, size=18),
                    ft.Text("Settings failed to load", size=14, weight=ft.FontWeight.BOLD, color=RED),
                ], spacing=8),
                ft.Text(str(exc)[:200], size=11, color=MUTED),
            ], spacing=4),
            padding=14,
            bgcolor="#FFF5F6",
            border_radius=10
        )
        root.controls = [err_banner]

    pad_h = 12 if is_mobile(page) else 28
    pad_v_top = 14 if is_mobile(page) else 24
    pad_v_bottom = 84 if is_mobile(page) else 24
    return ft.Container(root, padding=padding_box(horizontal=pad_h, top=pad_v_top, bottom=pad_v_bottom), expand=True, bgcolor=BG)
