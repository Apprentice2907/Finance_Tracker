# Wini 🛺

Wini is a fast, voice-first personal expense tracker for Android built with Expo SDK 57 (React Native), TypeScript strict mode, and local-first SQLite.

It is designed for personal daily finance in India with zero login, zero cloud servers, full offline functionality, and seamless English/Hinglish speech parsing.

---

## 🌟 Key Features

- **Voice-first expense logging**: Tap the pulsing mic and speak naturally:
  - *"add 10 rupees rickshaw"*
  - *"das rupaye chai"*
  - *"kal 100 petrol"*
  - *"paid rahul 500"*
  - *"uber 250 airport"*
  - *"got 50000 salary"*
- **Rule-based sentence parser**: Instant deterministic natural language extraction of amount, category, note, and date (Asia/Kolkata IST) with zero cloud latency or API keys.
- **Type-instead pipeline**: The exact same parsing pipeline is available via a keyboard input modal for silent or noisy environments.
- **Learned keywords**: When an unknown word is confirmed or re-categorized, Wini remembers it in SQLite `keyword_map` and prioritizes it in future parsing.
- **Fintech wallet aesthetic**:
  - Stacked wallet cards on Home with spring animation physics.
  - "Change vs last month" calculation chip and privacy eye toggle.
  - Docked floating mic button with animated pulsating ripple ring.
  - Recent entries with swipe-to-delete and instant Undo snackbar.
- **Insights & SVG charts**:
  - Interactive daily spend bar chart built with pure `react-native-svg`.
  - Week and Month toggle with daily average and biggest expense metrics.
  - Category breakdown with visual progress bars.
- **Backup & Restore**: Single-file JSON export/import through the system share dialog, schema validation, count preview, and Merge or Replace restore modes.
- **100% Offline & Private**: All data is stored in on-device SQLite.

---

## 🛠️ Architecture & Tech Stack

```
app/                  Expo Router screens (index, history, insights, settings)
src/
  db/                 SQLite schema, migrations, adapter, and Repository
  domain/             Money (integer paise math), dates (Asia/Kolkata), categories, types
  parser/             parseUtterance, number words (EN/HI), keyword mapping, dates
  speech/             SpeechService interface, ExpoSpeechService, FakeSpeechService
  backup/             Backup schema validator, export, file picker, and restore
  ui/                 Design tokens, SVG icons, animated sheets, error boundaries
  state/              Zustand store built on SQLite Repository
```

| Area | Choice |
|---|---|
| Framework | Expo SDK 57, React Native 0.86, TypeScript strict mode |
| Navigation | Expo Router (tabs layout) |
| Database | `expo-sqlite` (async API with `PRAGMA user_version` migrations) |
| Speech | `expo-speech-recognition` (`en-IN`, on-device with network fallback) |
| State | Zustand 5 |
| Animations & Haptics | `react-native-reanimated`, `expo-haptics` |
| Charts | Custom SVG with `react-native-svg` |
| Test Runner | Jest (130 automated unit, stress, and integration tests) |

---

## 🚀 Development & Testing

### 1. Install Dependencies
```bash
npm install
```

### 2. Run All Tests
```bash
npm test
```
Runs 130 tests across 5 test suites:
- `parser.test.ts`: Acceptance criteria, English & Hindi number words, boundary dates, garbage input.
- `stress.test.ts`: 45 realistic Indian daily life stress test sentences.
- `confirmFlow.test.ts`: Confirm sheet routing, amount overrides, and learned keywords.
- `repository.test.ts`: SQLite repository, day grouping, totals by period/category, soft deletes.
- `backup.test.ts`: Schema validation and database export/import round-trip.

### 3. TypeScript Typecheck
```bash
npx tsc --noEmit
```

### 4. Start Expo Development Server
```bash
npx expo start
```

---

## 📦 Building Standalone Android APK

Wini uses EAS Build with profiles configured in [eas.json](file:///d:/Finance%20Tracker/eas.json).

### Build Standalone Preview APK (Directly installable on phone):
```bash
npx eas build --profile preview --platform android
```
This generates a standalone release `.apk` file that can be installed on any Android phone without a dev server.

### Build Development Client (For local debugging):
```bash
npx eas build --profile development --platform android
```

For the step-by-step phone verification instructions, see [RELEASE_CHECKLIST.md](file:///d:/Finance%20Tracker/RELEASE_CHECKLIST.md).
