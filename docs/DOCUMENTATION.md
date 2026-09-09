# Finance Tracker — Project Documentation

A high-performance personal finance tracking application built with Python, Flet (Flutter engine), and SQLite. Designed for responsive use across Windows Desktop and Android/mobile devices with sub-millisecond query performance at scale.

---

## 1. System Architecture

```
+-------------------------------------------------------------------------+
|                        FLET RESPONSIVE PRESENTATION                     |
|      (Adaptive Layout: Desktop Header & Mobile Bottom Navigation Bar)   |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                         APPLICATION SERVICE LAYER                       |
|   (Period Calculations, Comparative Analytics, Color Mapping, Formats)  |
+-------------------------------------------------------------------------+
                                    |
                    +---------------+---------------+
                    |                               |
                    v                               v
+---------------------------------------+  +------------------------------+
|     BOUNDED LRU QUERY CACHE           |  |    STREAMING EXCEL ENGINE    |
|   (128 Keys, Eager Invalidation)      |  | (openpyxl read_only chunked) |
+---------------------------------------+  +------------------------------+
                    |                               |
                    +---------------+---------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                         DATABASE REPOSITORY LAYER                       |
|    (Transactions, Accounts, Categories, Daily Aggregates, Bulk Engine)  |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                       SQLITE 3 HIGH-PERFORMANCE ENGINE                  |
|    (WAL Mode, synchronous=NORMAL, 64MB Cache, Atomic Trigger Pipeline)  |
+-------------------------------------------------------------------------+
```

---

## 2. Core Features & Capabilities

- **Responsive Multi-Platform UI**: Adapts automatically between wide desktop layouts and single-column mobile views.
- **Accounts & Live Balance Tracking**: Track multiple bank accounts (e.g. *HDFC*, *SBI*), brokerage/demat investments (*Angel One*), and cash wallets with aggregate total liquid funds.
- **Transaction Management**: Name/title support with category pills, date pickers, notes, and search filtering.
- **Loans & Lending System**: Dedicated category in both Income and Expense for tracking lent money, repayments, and net balance.
- **Dynamic Financial Reports**: Monthly cashflow bar charts, category donut breakdowns, and period-over-period comparisons.
- **Streaming Excel & CSV Engine**: Chunked import and export with duplicate detection and spreadsheet formula injection protection.
- **Online Backup & Restore**: Live SQLite vacuum/backup to safe archival destinations with SHA-256 metadata verification.

---

## 3. Database & Performance Engineering

### 3.1 SQLite Engine Configuration
Every database connection is initialized with high-throughput PRAGMA configurations:
- `PRAGMA journal_mode = WAL`: Eliminates read/write blocking; allows concurrent queries while writes append to WAL log.
- `PRAGMA synchronous = NORMAL`: Prevents unnecessary filesystem syncs on every commit while retaining durability in WAL mode.
- `PRAGMA cache_size = -64000`: Allocates 64MB of dedicated in-memory page cache.
- `PRAGMA temp_store = MEMORY`: Directs temporary B-tree tables and sorting into RAM.

### 3.2 Covering Composite B-Tree Indexes
- `idx_transactions_date`: `(date)`
- `idx_transactions_category`: `(category_id)`
- `idx_trans_composite`: `(type, date, category_id, amount)` — index-only scans for dashboard aggregation.
- `idx_trans_cat_sort`: `(category_id, type, date DESC)` — fast filtering and sorting.
- `idx_transactions_name`: `(name)` — accelerated transaction title searches.

### 3.3 Continuous Trigger Synchronization
Pre-computed daily rollups are maintained in `daily_aggregates`:
- **`trg_trans_insert`**: Automatically upserts daily totals on new transactions.
- **`trg_trans_delete`**: Decrements total amounts and transaction counts.
- **`trg_trans_update`**: Adjusts previous and new values within an atomic transaction.

---

## 4. Benchmark Performance Summary

| Operation | Baseline (Naive) | Optimized Engine | Speedup |
| :--- | :--- | :--- | :--- |
| **Dashboard Query (1M Rows)** | `879.69 ms` | `0.178 ms` | **~4,900x** |
| **Search / Filter (1M Rows)** | `58.20 ms` | `0.560 ms` | **~104x** |
| **Category Aggregation** | `1,328.97 ms` | `2.155 ms` | **~616x** |
| **Warm Cache Hit** | `—` | `0.080 ms` | **Instant** |
| **Memory RSS (Idle at 1M Rows)** | `49.7 MB` | `29.5 MB` | **-40.6%** |

---

## 5. Testing & Verification Suite

The `tests/` directory includes end-to-end verification covering database integrity, cache correctness, and financial invariance:

- **`test_suite.py`**: Full CRUD verification, FK safeguards, period helpers, Excel/CSV exports, and SQLite backup/restore.
- **`test_performance_integration.py`**: Mathematical consistency between raw transactions and daily aggregates, bounded LRU cache invalidation.
- **`crash_consistency_test.py`**: WAL recovery and process termination resilience.
- **`test_fuzzing.py`**: SQL injection payload resilience and Unicode edge case handling.
- **`property/test_financial_invariants.py`**: Hypothesis property-based testing verifying `Income - Expense == Net Balance` under randomized transaction streams.

Run tests with:
```bash
python tests/test_suite.py
python tests/test_performance_integration.py
```

---

## 6. Local Setup & Running

### Requirements
- Python 3.10+
- Dependencies: `flet`, `openpyxl`

### Running on Desktop:
```bash
python main.py
```

### Running on Local Network / Mobile (Web Mode):
```bash
python main.py --web --port 8550
```
Open `http://<YOUR_PC_IP>:8550` on your mobile browser and tap **"Add to Home Screen"** to install.
