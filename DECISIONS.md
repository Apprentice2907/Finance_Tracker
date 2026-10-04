# Architecture & Engineering Decisions (Wini)

This document records key technical decisions, assumptions, and deviations from defaults made during the development of Wini.

## 1. Storage & Schema
- **Integer Paise Representation**: All monetary values are strictly stored as integer paise (e.g. ₹10.50 -> 1050 paise) to prevent floating-point rounding errors.
- **Async SQLite via `expo-sqlite`**: We use the modern async API of `expo-sqlite` (`openDatabaseAsync`, `runAsync`, `getAllAsync`, `getFirstAsync`).
- **Pragma `user_version` Migrations**: Schema migrations are tracked incrementally via SQLite `user_version`.
- **Soft Deletes**: Transactions and categories are soft-deleted with `deleted_at` timestamp. Queries filter out `deleted_at IS NOT NULL`.

## 2. Parser Architecture
- **Pure Function Design**: `parseUtterance(text, now, tz, keywords)` is completely pure, deterministic, and free of platform dependencies. This allows comprehensive testing in plain Node.js / Jest.
- **Hinglish & Number Words**: Both English digits, multipliers ("k", "lakh"), and number words in English ("ten", "twenty five") and Hindi ("ek", "do", "das", "sau", "hazaar") are parsed.
- **Kal Interpretation**: In Hindi voice input, "kal" can mean yesterday or tomorrow; for expense tracking context, it is consistently resolved to yesterday as per the brief.
- **Learned Keywords Priority**: Dynamic user-confirmed mappings take priority over default keyword mappings.

## 3. Voice & Speech Recognition
- **On-Device First with Network Fallback**: `ExpoSpeechService` requests `requiresOnDevice: true` with locale `en-IN`. If the on-device recognition model is not installed on the Android device, it catches the error and gracefully falls back to network recognition without failing the user request.
- **Multiple Number & Quantity Scoring**: Natural voice speech often contains multiple numbers (e.g. "2 chai 20 rupees", "room 101 rent 15000", "uber 250 airport"). `extractAmount` implements a candidate scoring heuristic: numbers with adjacent currency terms ("rupees", "rs", "₹", "inr") receive `+80` points; numbers preceded by action prepositions ("paid rahul 500", "sent 250") receive `+40` points; identifier prefixes ("room", "bus", "flat") receive `-100` penalty; small integers immediately preceding item nouns receive `-40` penalty. The top-scoring token is assigned as the transaction amount, while quantity tokens are preserved in the note.
- **Plural Suffix Resolution**: Users often pluralize items ("2 coffees 180", "pizzas 450"). Keyword matching automatically checks both the exact word and singular stemmed forms (`-s`, `-es`).
- **Low Confidence Routing**: If parsed confidence is low (< 0.7) or amount is missing, the confirm flow automatically opens the pre-filled manual edit form rather than showing a broken confirmation sheet.

## 4. Tech Stack & Dependencies
- **Expo SDK 57**: Latest stable Expo with React Native 0.86 and React 19.
- **State Store**: Lightweight reactive state using `zustand`, delegating all mutations to the SQLite `Repository`.
- **Cross-Platform SQLite Test Adapter**: To bypass C++ ABI compatibility issues with `better-sqlite3` under Node 22 on Windows, the test suite uses `sql.js` (WebAssembly SQLite) which mirrors SQLite behavior with zero native compilation dependencies.
- **Custom SVG Charts**: Built using `react-native-svg` for minimal footprint and maximum control over aesthetics.
- **Haptics & Animations**: `expo-haptics` and `react-native-reanimated` for smooth micro-interactions.
## 5. Backup, Builds & Release
- **Single-File JSON Backup**: Backups are self-contained JSON files named `wini-backup-YYYY-MM-DD.json`. Every backup file contains an explicit envelope (`app: 'wini'`, `schemaVersion: 1`, `exported_at`), transaction records, categories, and learned keywords.
- **Strict Schema Validation**: To prevent database corruption or malicious file injection, `validateBackupSchema` rigorously validates that all IDs are strings, timestamps are ISO-8601 formatted, and amounts are non-negative integers representing paise. Corrupted or invalid payloads are rejected with clear error messages before touching SQLite.
- **Merge vs Replace Semantics**:
  - `Replace`: Cleans active transaction and keyword tables, replacing them with the backup's exact snapshot. System default categories are preserved or restored.
  - `Merge`: Inserts records from the backup if they do not exist; if a transaction with the same ID exists, it updates only if the backup's timestamp is newer.
- **Android Scoped Storage & Sharing**: To comply with Android 11+ (API 30+) scoped storage restrictions, file export writes the JSON to `FileSystem.cacheDirectory` via `expo-file-system/legacy` and immediately invokes the Android system share sheet via `expo-sharing`. This allows users to save to Google Drive, WhatsApp, Downloads, or local files without requiring dangerous `WRITE_EXTERNAL_STORAGE` permissions.
- **EAS Build Architecture**:
  - `development` profile: Produces an internal Android APK with `expo-dev-client` for live debugging of native modules (`expo-speech-recognition`, `expo-sqlite`, `expo-haptics`).
  - `preview` profile: Produces a standalone standalone release-ready APK for direct distribution and sideloading on physical devices.
