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

## 3. Tech Stack & Dependencies
- **Expo SDK 57**: Latest stable Expo with React Native 0.86 and React 19.
- **State Store**: Lightweight reactive state using `zustand`, delegating all mutations to the SQLite `Repository`.
- **Custom SVG Charts**: Built using `react-native-svg` for minimal footprint and maximum control over aesthetics.
- **Haptics & Animations**: `expo-haptics` and `react-native-reanimated` for smooth micro-interactions.
