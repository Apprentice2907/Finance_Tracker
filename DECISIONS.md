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

