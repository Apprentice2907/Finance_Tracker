# Finance Tracker

A fast, local-first personal finance application built with **Python**, **Flet**, and **SQLite**. Designed as a clean, responsive daily expense and budget tracker across Windows Desktop and Android, while serving as a study in local database optimization, constant-memory streaming I/O, and low-latency systems engineering.

---

## 📸 Screenshots

| Desktop Dashboard & Analytics | Android Portrait & Ledger |
|:---:|:---:|
| 📊 Multi-column financial overview, cashflow & insights | 📱 Thumb-friendly bottom navigation & quick entry |

---

## ✨ Features

- **Personal Finance Dashboard**:
  - Net balance, income, expenses, and savings change at a glance.
  - Global period selector (*Today, Yesterday, This Week, Last Week, This Month, Last Month, This Year, Last Year, Custom*).
  - Deterministic algorithmic insights (month-over-month spending rate, top category %, peak spending day).
  - Monthly cashflow activity bar chart and category breakdown donut chart.
- **Fast Transaction Entry & Ledger**:
  - Auto-focused amount field, sensible default dates, category memory, and inline error validation.
  - Sub-millisecond search across notes, categories, amounts, and dates.
  - Multi-filtering (Type, Category, Date) and multi-column sorting (Newest, Oldest, Highest, Lowest).
- **Lightweight Monthly Budgets & Categories**:
  - Customizable categories with curated color palettes.
  - Monthly spending target progress tracking with remaining balance and percentage indicators.
  - Foreign key protection preventing accidental deletion of categories in active use.
- **Monthly Financial Summary**:
  - Month-by-month browser showing income, expenses, net saved, savings rate, and largest transaction.
- **Data Portability & Backup**:
  - Constant-memory streaming Excel export and validated import (`openpyxl` `write_only` pipeline).
  - Formula-injection-safe CSV export protecting against spreadsheet DDE execution.
  - 7-stage sandbox SQLite backup and restore with integrity verification and automatic rollback.
- **First-Run Onboarding & Error UX**:
  - 4-step quickstart walkthrough modal.
  - Actionable empty states and user-friendly error messages that hide raw technical tracebacks.

---

## 🛠️ Tech Stack

- **UI Framework**: [Flet](https://flet.dev/) (Python wrapper for Flutter)
- **Database**: [SQLite 3](https://sqlite.org/) (WAL Mode, `synchronous=NORMAL`, 64MB page cache)
- **Data I/O**: [openpyxl](https://openpyxl.readthedocs.io/) (streaming mode), Python standard library `csv`
- **Visualizations**: [Matplotlib](https://matplotlib.org/)
- **Testing & Benchmarking**: Python `unittest`, `tracemalloc`, `psutil`

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Flet UI (Desktop / Mobile)               │
│  Dashboard | Transactions | Reports | Categories | Settings │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                   Application / Logic Layer                 │
│   Period Helper | Insights Engine | CSV & Excel Streamer    │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Storage & Caching Layer                  │
│       Bounded LRU Cache (SHA-256 Invalidation)              │
│       Covering Composite B-Tree Indexes                     │
│       Incremental SQLite Triggers (daily_aggregates)        │
│       SQLite WAL Engine (synchronous=NORMAL, 64MB Cache)    │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚡ Performance

All metrics measured using `benchmarks/official_benchmark.py` across isolated datasets on local SSD storage:

### Verified Latency Matrix (Source: `docs/PUBLIC_BENCHMARKS.md`)

| Operation / Workload | 10K Dataset (p50) | 100K Dataset (p50) | 1,000,000 Dataset (p50) | 1M Throughput |
|:---|---:|---:|---:|---:|
| **Dashboard: Period Totals (Warm)** | **0.078 ms** | **0.172 ms** | **0.172 ms** | **5,813.9 ops/s** |
| **Dashboard: Full 5-Query Composite** | **3.023 ms** | **7.455 ms** | **6.554 ms** | **152.6 ops/s** |
| **Transaction Listing (50 rows)** | **0.171 ms** | **0.172 ms** | **0.176 ms** | **5,681.8 ops/s** |
| **Search (`LIKE '%term%'`, 50 rows)**| **0.567 ms** | **1.478 ms** | **0.583 ms** | **1,715.3 ops/s** |
| **Category Aggregation (1-Year)** | **1.028 ms** | **2.240 ms** | **2.122 ms** | **471.2 ops/s** |
| **Monthly Cashflow (12-Month)** | **1.767 ms** | **12.930 ms** | **4.446 ms** | **224.9 ops/s** |
| **Batch Import (1,000 rows)** | **9.648 ms** | **36.949 ms** | **10.239 ms** | **97.6 batches/s** |
| **Streaming Export (1,000 rows)** | **6.729 ms** | **22.977 ms** | **18.264 ms** | **54.7 ops/s** |
| **DB Connection Init & Ping** | **0.259 ms** | **1.094 ms** | **0.238 ms** | **4,201.7 ops/s** |

### Before vs. After Optimization (1M Records)
- **Full Dashboard Render Latency**: **796.28 ms → 6.55 ms** (over **120x speedup** via incremental triggers)
- **50K Excel Export RAM**: **84.30 MB → 0.40 MB** (**210x less memory** via streaming generators)
- **Concurrent Readers**: **1.23 ops/s → 1,542.4 ops/s** (**1,250x throughput** under SQLite WAL mode)

---

## 🔒 Reliability & Security

- **Crash-Consistent Backups**: 7-stage sandbox restore validates `PRAGMA integrity_check`, table schemas, and checksums before atomic filesystem swap with automatic rollback.
- **Spreadsheet Formula Injection Defense**: Prepends `'` to export fields starting with `=`, `+`, `-`, `@`, `\t`, `\r` to neutralize spreadsheet DDE formula execution.
- **Transactional Schema Migrations**: Schema versioning managed via `PRAGMA user_version` with atomic rollback on migration errors.

---

## 🧪 Testing

Comprehensive automated test suite covering functional, property-based, and failure recovery scenarios:

```bash
# Core functional tests (10 test cases)
python test_suite.py

# Performance & cache integration tests
python test_performance_integration.py

# Full test suite (migrations, corruption, fuzzing, property invariants)
python -m unittest discover -s tests
```

---

## 📱 Android Support

- Adaptive layout reflows between desktop multi-column canvas and mobile portrait navigation.
- Platform-safe SQLite path resolver for Android application data sandbox.
- Constant-memory streaming I/O prevents Out-Of-Memory (OOM) process termination on low-RAM mobile devices.

Build an Android APK using the official Flet CLI:
```bash
flet build apk --project "Finance Tracker" --org "com.financetracker.app"
```

---

## 🚀 Installation & Quickstart

### 1. Prerequisites
- Python 3.8+ (tested on Python 3.12)
- Git

### 2. Setup
```bash
# Clone repository
git clone https://github.com/Apprentice2907/Finance_Tracker.git
cd Finance_Tracker

# Create & activate virtual environment
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run application
python main.py
```

### 3. Load Optional Synthetic Demo Data
```bash
python utils/demo_data.py
```

---

## 🔬 Running Benchmarks

```bash
# Run canonical benchmark suite (10K, 100K, 1M records)
python benchmarks/official_benchmark.py

# Launch interactive terminal performance lab
python benchmarks/perf_lab.py

# Compare LIKE vs FTS5 search performance (Archived)
python benchmarks/archive/search_fts5_benchmark.py
```

---

## 💡 Engineering Decisions

1. **Incremental SQLite Triggers vs. Full Scans**:
   Naive aggregate queries scanned all 1,000,000 rows. Creating a trigger-maintained `daily_aggregates` table reduced dashboard row scans to at most 365 rows, cutting median latency by over 120x with negligible (0.4 ms) insert overhead.
2. **Streaming Generator Pipelines vs. DOM Export**:
   Loading 50,000 transactions into a DOM-based Excel workbook consumed 84 MB of RAM. Using `openpyxl.Workbook(write_only=True)` reduced memory usage to 0.40 MB (210x reduction), eliminating mobile OOM crashes.
3. **Why Native C++ Was Formally Rejected**:
   Profiling proved that 99.19% of execution time was spent inside SQLite's internal C-engine B-tree traversal; Python CPU time was under 0.05 ms. Marshaling row objects across FFI boundaries would have added ~120 ms of overhead, making a C++ module slower than indexed SQLite queries while introducing cross-compilation friction.

---

## ⚠️ Limitations

- **Single-User Offline Architecture**: Designed for single-user local financial management; does not include multi-device cloud synchronization or team collaboration.
- **Local Filesystem Access**: Desktop file dialogs require standard filesystem read/write permissions.

---

## 🔮 Future Work

- Automated recurring transaction schedules (e.g. monthly subscriptions).
- Optional database encryption at rest using SQLCipher.
- Multi-currency conversion support.

---

## 📄 License
[MIT License](LICENSE)
