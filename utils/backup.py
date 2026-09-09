import os
import shutil
import sqlite3
import hashlib
import json
import time
from typing import Tuple, Dict, Any
from db.database import get_db_path, configure_sqlite_connection
from db.aggregate_validator import validate_aggregate_consistency
from db.transactions import invalidate_cache

def compute_file_sha256(file_path: str) -> str:
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            sha256.update(chunk)
    return sha256.hexdigest()

def create_database_backup(destination_path: str) -> Tuple[str, Dict[str, Any]]:
    """
    Creates an atomic, verified online backup copy of the active SQLite database
    along with companion integrity metadata (SHA-256 checksum, row counts, schema version).
    """
    source_db = get_db_path()
    if not os.path.exists(source_db):
        raise FileNotFoundError(f"Source database file does not exist at: {source_db}")

    # Step 1: Perform online SQLite hot backup
    src_conn = sqlite3.connect(source_db)
    dst_conn = sqlite3.connect(destination_path)
    with dst_conn:
        src_conn.backup(dst_conn)
    dst_conn.close()
    src_conn.close()

    # Step 2: Compute Checksum & Metadata
    db_size = os.path.getsize(destination_path)
    checksum = compute_file_sha256(destination_path)

    chk_conn = sqlite3.connect(destination_path)
    cur = chk_conn.cursor()
    cur.execute("SELECT COUNT(*) FROM transactions")
    tx_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM categories")
    cat_count = cur.fetchone()[0]
    chk_conn.close()

    metadata = {
        "schema_version": "1.0",
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "transaction_count": tx_count,
        "category_count": cat_count,
        "database_size_bytes": db_size,
        "checksum_sha256": checksum
    }

    meta_file = destination_path + ".meta.json"
    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    return destination_path, metadata

def restore_database_from_backup(backup_path: str) -> Tuple[bool, str]:
    """
    Hardened 7-stage restore workflow:
    1. Verify backup file existence and checksum (if metadata available)
    2. Restore to temporary sandbox database
    3. PRAGMA integrity_check
    4. PRAGMA foreign_key_check
    5. Schema table validation
    6. Aggregate consistency validation
    7. Atomic replacement of live database
    """
    if not os.path.exists(backup_path):
        return False, "Selected backup file does not exist."

    # Stage 1: Optional Checksum Verification
    meta_file = backup_path + ".meta.json"
    if os.path.exists(meta_file):
        try:
            with open(meta_file, "r", encoding="utf-8") as f:
                meta = json.load(f)
            expected_hash = meta.get("checksum_sha256")
            if expected_hash:
                actual_hash = compute_file_sha256(backup_path)
                if actual_hash != expected_hash:
                    return False, "Restore aborted: Backup file SHA-256 checksum mismatch (corrupted backup file)."
        except Exception:
            pass

    # Stage 2: Restore to Temporary Sandbox Database
    dest_db = get_db_path()
    sandbox_db = dest_db + ".restore_sandbox.db"
    if os.path.exists(sandbox_db):
        try: os.remove(sandbox_db)
        except OSError: pass

    try:
        src_conn = sqlite3.connect(backup_path)
        sandbox_conn = sqlite3.connect(sandbox_db)
        with sandbox_conn:
            src_conn.backup(sandbox_conn)
        sandbox_conn.close()
        src_conn.close()

        # Stage 3: Low-Level Integrity Check
        sandbox_conn = sqlite3.connect(sandbox_db)
        cur = sandbox_conn.cursor()
        cur.execute("PRAGMA integrity_check")
        integ_res = cur.fetchone()[0]
        if integ_res != "ok":
            sandbox_conn.close()
            return False, f"Restore aborted: Backup SQLite integrity check failed ({integ_res})."

        # Stage 4: Foreign Key Check
        cur.execute("PRAGMA foreign_key_check")
        fk_errs = cur.fetchall()
        if fk_errs:
            sandbox_conn.close()
            return False, f"Restore aborted: Found {len(fk_errs)} foreign key violations in backup."

        # Stage 5: Schema Table Check
        tables = [row[0] for row in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
        if "transactions" not in tables or "categories" not in tables:
            sandbox_conn.close()
            return False, "Restore aborted: Missing essential schema tables in backup."

        sandbox_conn.close()

        # Stage 6: Aggregate Mathematical Consistency Check
        agg_val = validate_aggregate_consistency(sandbox_db)
        if not agg_val["is_consistent"]:
            return False, f"Restore aborted: Aggregate inconsistencies detected in backup ({agg_val['discrepancies']})."

        # Stage 7: Atomic Replacement of Live Database
        live_conn = sqlite3.connect(dest_db)
        configure_sqlite_connection(live_conn)
        sb_conn = sqlite3.connect(sandbox_db)
        with live_conn:
            sb_conn.backup(live_conn)
        sb_conn.close()
        live_conn.close()

        # Invalidate in-memory query cache
        invalidate_cache()

        return True, "Database successfully verified and restored."

    except Exception as exc:
        return False, f"Restore failed during verification: {str(exc)}"

    finally:
        if os.path.exists(sandbox_db):
            try: os.remove(sandbox_db)
            except OSError: pass
        for ext in ["-wal", "-shm"]:
            if os.path.exists(sandbox_db + ext):
                try: os.remove(sandbox_db + ext)
                except OSError: pass
