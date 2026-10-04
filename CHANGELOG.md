# Changelog

All notable changes to the Wini project will be documented in this file.

## [Phase 3: Voice and Confirm Flow] - 2026-10-04

### Added
- **Speech Service Interface & Implementations**:
  - `SpeechService` contract defining `startListening`, `stopListening`, `cancelListening`, `isAvailableAsync`, `supportsOnDeviceAsync`, and state subscriptions.
  - `ExpoSpeechService` built on `expo-speech-recognition` preferring on-device recognition (`en-IN`) with automatic fallback to network recognition if offline model packs are not downloaded. Friendly localized error messages for permission denial, silence timeout, recognizer unavailability, and speech errors.
  - `FakeSpeechService` for deterministic automated tests and mock simulations.
- **Voice UI Components**:
  - `VoiceSheet`: Modal with an animated pulsating microphone button, live partial transcript preview, friendly error banner with direct button to "Type instead", and clean state transitions.
  - `ConfirmSheet`: Bottom sheet displaying parsed amount, editable category chip with selector, transaction date picker/indicator, note field, original "Heard: ..." transcript, and actions (Save, Edit, Cancel). Includes vibration feedback via `expo-haptics` and toast confirmation ("Added ₹10 for Transport.").
  - Low-confidence parser detection routes directly to the edit form prefilled with available candidate values.
- **Learned Keywords**:
  - Automatically associates unknown words from notes to selected categories upon manual user confirmation.
  - Persists learned keyword pairs to SQLite `keyword_map` table and reloads them dynamically into the parser.
  - Settings screen section allowing users to view and delete individual learned keywords.
- **Voice & Parser Stress Tests**:
  - 45 realistic Indian daily life stress test cases covering quantities ("2 chai 20 rupees"), names ("paid rahul 500"), locations ("uber 250 airport"), Hinglish syntax ("chai aur samosa 40"), decimals and commas ("1,250.50"), "k" and "lakh" ("2.5k", "1.5 lakh"), multiple numbers, income phrases ("salary 75000", "interest 1200"), and relative dates ("kal", "parso", weekdays).
  - 5 confirm flow integration tests validating low-confidence routing, learned keyword persistence, and amount overrides.
- **EAS Configuration**:
  - Created `eas.json` with `development` (internal distribution, development client enabled) and `preview` (standalone internal APK) build profiles.

### Changed
- `src/parser/parseUtterance.ts`:
  - Upgraded candidate selection algorithm to score multiple numbers in a sentence (prioritizing currency keywords, action verbs, penalizing item counts and identifiers like "room 101").
  - Preserved item quantities in the transaction note (e.g. "2 Chai 20 rupees" -> Note: "2 Chai", Amount: 2000 paise).
- `src/parser/categories.ts`:
  - Added plural stem matching to handle pluralized voice inputs ("pizzas" -> "pizza", "coffees" -> "coffee", "movies" -> "movie").
  - Extended keyword dictionary with daily Indian vocabulary (swiggy, zomato, blinkit, zepto, chai, samosa, biryani, auto, metro, uber, ola, petrol, rent, wifi, electricity, netflix, medicine, salary, freelance, etc.).
- `app/index.tsx`:
  - Added primary floating mic button in the bottom dock with smooth trigger for voice recognition.
  - Integrated `VoiceSheet` and `ConfirmSheet` flows.
- `app/settings.tsx`:
  - Added interactive "Learned Keywords" manager with real-time deletion.

### Verified
- Automated test suite passed with 121 tests across 4 test suites:
  - `parser.test.ts`: 59 tests passed.
  - `stress.test.ts`: 45 tests passed.
  - `confirmFlow.test.ts`: 5 tests passed.
  - `repository.test.ts`: 12 tests passed.
- TypeScript strict typecheck passed (`tsc --noEmit` exited with 0 errors).

### Known Gaps
- Physical microphone hardware and on-device offline speech recognition models require testing on a physical Android device or development build.

---

## [Phase 2: Sentence Parser] - 2026-10-04

### Added
- Pure TypeScript natural language parser (`parseUtterance`) for English and Hinglish expense sentences.
- Comprehensive English & Hindi number word converter supporting numbers up to crores, compound words, and multipliers (k, lakh, cr).
- Indian Standard Time (Asia/Kolkata) date resolver for relative terms ("aaj", "kal", "parso", "yesterday", weekdays).
- Default keyword dictionaries for 8 system expense/income categories.
- 59 Jest tests covering 13 acceptance criteria, edge cases, garbage input rejection, and midnight/month boundaries.

---

## [Phase 1: Foundation & Manual Entry] - 2026-10-04

### Added
- Domain models: paise integer math, Indian numbering formatters (`₹1,23,456.78`), IST date helpers, and UUID generators.
- SQLite schema with `transactions`, `categories`, and `keyword_map` tables.
- Migration system tracked by SQLite `PRAGMA user_version`.
- Database repository with soft deletes, day grouping, totals by period/category, and backup/restore methods.
- Cross-platform SQLite adapter: `expo-sqlite` for native Android/iOS and `sql.js` (WebAssembly) for Node.js test environment.
- Zustand reactive application store.
- Modern dark navy fintech UI with custom SVG icons, error boundaries, transaction creation/edit modal, home summary, and history list.
- 12 Jest repository tests.

---

## [Phase 0: Checkpoint & Setup] - 2026-10-04

### Added
- Git tag `flet-final` and branch `legacy-flet` safeguarding legacy Python Flet application.
- Initialized Expo SDK 57 React Native project with TypeScript strict mode and Expo Router.
