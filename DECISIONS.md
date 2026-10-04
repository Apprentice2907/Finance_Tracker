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
- **Dual Voice Engine Architecture**: Wini supports two complementary speech engines via the `SpeechService` interface:
  1. **Phone Recognizer (`ExpoSpeechService`)**: Uses Android's native speech recognition system (`expo-speech-recognition`).
     - Fast, instant startup, lightweight, and requires no initial model download.
     - Contextual biasing strings (`contextualStrings`) inject finance terms, currency tokens, Hindi/English numerals, and learned keywords directly into the Android recognition session.
     - Multi-alternative parsing: inspects up to 5 recognizer alternatives and picks the candidate with highest parser confidence.
  2. **On-Device Whisper Engine (`WhisperSpeechService`)**: Runs OpenAI's Whisper model locally on-device using `whisper.rn` (whisper.cpp GGML bindings).
     - 100% private and offline: audio is recorded as 16 kHz mono 16-bit PCM WAV in memory/cache and processed entirely on the CPU. No audio or text ever leaves the phone.
     - Custom Initial Prompt: Injects sample financial commands ("add 10 rupees rickshaw. chai 20 rupees. kal 100 petrol. parso metro 50.") and category vocabulary to bias decoding towards expenses.
- **Default Engine Choice**:
  - The default voice engine remains **Phone Recognizer**.
  - Rationale: First-time users can immediately start speaking without being forced to download a 57MB model file over mobile data. Users can switch to Whisper anytime in Settings.
- **Privacy vs Accuracy Trade-off (Prefer On-Device Setting)**:
  - **On-Device (`preferOnDevice: true`)**: Highest privacy (audio never touches external servers) and works in airplane mode. However, on older phones or without the Android Google offline speech pack, accuracy on accented Hinglish can be lower.
  - **Online (`preferOnDevice: false`)**: Sends audio to cloud speech APIs. Tests demonstrate noticeably higher accuracy in noisy outdoor street environments, code-switched Hindi-English speech, and unusual accents.
  - Wini exposes a clear toggle in Settings: "Prefer on-device recognition", defaulting to on-device (`true`) to prioritize privacy first.
- **Whisper Model Catalog & Sizing**:
  - Quantized `q5_1` GGML models from the official `ggerganov/whisper.cpp` Hugging Face repository are used for optimal balance of memory and CPU performance:
    - `tiny-q5_1` (~30.7 MB, sha256 `3e8822ab...`): ultra-fast, lowest RAM, suited for budget devices.
    - `base-q5_1` (~56.9 MB, sha256 `1472da3b...`): **Default Whisper model**, balanced latency and accuracy.
    - `small-q5_1` (~181.3 MB, sha256 `f4a8c6ba...`): **Recommended** for devices with 4GB+ RAM, superior accuracy with Indian accents.
  - Models are downloaded on-demand into `FileSystem.documentDirectory` and never bundled in the APK. Free space check enforces required size + 20 MB safety buffer.
- **Graceful Automatic Fallback**:
  - If the user selects Whisper but the model has not been downloaded or initialization fails, `SpeechServiceFactory` automatically falls back to `ExpoSpeechService` and displays a non-blocking banner explaining why.
- **Conservative Fuzzy Keyword Matching & Mishearing Normalization**:
  - `src/parser/misheard.ts` provides phonetic normalization (e.g. `chay` -> `chai`, `ricksha` -> `rickshaw`, `metor` -> `metro`) and Damerau-Levenshtein distance matching (edit distance 1-2 on tokens >= 4 letters).
  - Safety constraint: Fuzzy matching is strictly applied only during Category Resolution (Step 5) when no exact keyword match exists. It is never applied blindly to the raw text, avoiding corruption of names, dates, or notes.
  - Homophone disambiguation: Homophones like "to", "too", "for", "won", "ate" are only parsed as numbers when adjacent to a currency word or known item token.
  - Devanagari transliteration: Hindi numerals (१, २, १०), currency words (रुपये, रु), and dates (कल, परसों) are normalized into Romanized equivalents.
- **Voice Lab & Ground Truth Logging**:
  - `voice_log` SQLite table stores transcript evaluation pairs (engine, raw transcript, alternatives, parsed output, latency, correction flag).
  - No audio is ever stored.
  - Manual edits on ConfirmSheet log `corrected: true` and feed into learned keyword suggestions in Settings.

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
