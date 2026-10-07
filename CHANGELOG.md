# Changelog

All notable changes to the Wini project will be documented in this file.

## [Design Upgrade: Step 1 (Hero, Charts, Tokens & Restructure)] - 2026-10-07

### Added
- **PART 0: Layout Fix (`layout-fix-v1`)**:
  - Wrapped app in `SafeAreaProvider` with dynamic top/bottom insets and status bar theming.
  - Safe-area aware `Screen` component applied to all routes in `app/`.
  - Floating bottom navigation with 48px touch targets and full clearance over Android 3-button and gesture navigation bars.
  - Sized, keyboard-safe `BottomSheet` and modals with pinned action buttons and hardware back button dismissal.
  - Pure microcopy helpers with 20 unit test cases: `pluralize`, `formatRelativeDate`, `formatChange`, `shouldShowBackupReminder`.
  - Layout diagnostics card in Component Gallery displaying window size, font scale, and insets.
- **PART 1 (a): Design Tokens & UI Kit Components (`ui-step1-a`)**:
  - Implemented `HeroCard` (Cosmos silk textured hero, `PillSelector`, eye privacy toggle, net cashflow, dual `GlassChip`).
  - Implemented `PillSelector` (white, glass, surface2 variants) and `GlassChip`.
  - Implemented `CategoryIcon` (Block squircle, Glass frosted pill, and Plain glyph variants for 10 categories).
  - Implemented `CategoryTile` (2-column grid tiles with vector squircle, percentage badge, and amount).
  - Implemented hand-crafted SVG `BarChart` with 5-week buckets, zero stubs, and selected bar gradient (`#DCE4FF` → `#7E96FF` → `#5B5BF0`).
  - Implemented SVG `DonutChart` with 3-column legend, percentage breakdown, and segment selection.
  - Handled responsive geometry and chart maths in `chartGeometry.ts`.
- **PART 1 (b): Database Migration v5 & Emoji Elimination (`ui-step1-b`)**:
  - Added SQLite migration v5 with `categories.icon` column and automatic backfill from emoji strings to vector icon identifiers (`food`, `transport`, `shopping`, `bills`, `health`, `fun`, `education`, `salary`, `income`, `other`).
  - Completely purged emoji icons and emoji characters from all UI strings and screens.
  - Added automated `emojiScan.test.ts` scanning all `.tsx` files to guarantee zero emoji regression.
- **PART 1 (c): Home Restructure (`ui-step1-c`)**:
  - Restructured Home into 5 clean visual sections: 1. `HeroCard`, 2. Cashflow `BarChart` with Expenses/Income toggle & Month/Week picker, 3. Category breakdown `DonutChart` with 3-column legend & shared toggle, 4. Recent 5 transactions with "View all" lime button, 5. `FloatingNav` (docked, centre mic).
  - Implemented pure domain helpers in `src/domain/homeHelpers.ts` (`getWeeklyBucketsForMonth`, `getDailyBucketsForWeek`, `calculateHomeTotals`, `getDonutBreakdownData`) with 15 unit test cases.
- **PART 1 (d): Component Gallery Additions & Documentation (`ui-step1-d`)**:
  - Updated `ComponentGalleryScreen` (`app/gallery.tsx`) with dedicated showcases for `HeroCard`, `PillSelector`, `GlassChip`, `CategoryIcon` (all 3 variants & sizes), `BarChart` (weekly buckets & gradients), and `DonutChart` (3-column legend).
  - Updated architecture and UI Kit documentation in `docs/HOW_IT_WORKS.md` and `CHANGELOG.md`.

---

### Added
- **PART A: Measure (Voice Lab & Correction Logging)**:
  - Database Migration v2 adding `voice_log` SQLite table: `id`, `engine`, `raw_transcript`, `alternatives_json`, `parsed_json`, `final_saved_json`, `corrected`, `latency_ms`, `created_at`.
  - ConfirmSheet ground-truth correction logging: when users adjust parsed values before saving, the pair is logged with `corrected: true` (text only, zero audio recorded).
  - Voice Lab screen (`app/voice-lab.tsx`) under Settings: record test phrases, inspect latency and parser confidence, compare top recognizer alternatives, type ground-truth expected text, and export records via "Copy JSON".
  - Settings controls: "Keep voice log" toggle (default on) and "Clear voice log" action.
- **PART B: Quick Wins on Recognizer & Parser Accuracy**:
  - `src/speech/ExpoSpeechService.ts`: Injected contextual biasing strings (categories, Hindi/English numerals, currency terms, commands, and learned keywords), enabled up to 5 multi-alternatives, and free-form language modeling.
  - Multi-alternative parsing (`parseBestAlternative`): parses every candidate transcript and selects the one yielding the highest parser confidence.
  - Settings toggle: "Prefer on-device recognition" with clear privacy explanation (on-device keeps audio strictly local; online provides higher transcription accuracy for accents/noise).
  - `src/parser/misheard.ts`: Phrase alias map, phonetic normalization (e.g. `chay` -> `chai`, `ricksha` -> `rickshaw`), conservative fuzzy matching via Damerau-Levenshtein distance (edit distance 1-2 on tokens >= 4 chars, applied only in category step 5 when no exact match exists).
  - Homophone disambiguation rules: Number homophones ("to", "too", "for", "won", "ate") only resolve to numbers when adjacent to currency or item nouns.
  - Hindi & Devanagari numerals transliteration (`src/parser/devanagari.ts`).
  - Correction learning feedback: corrected words suggest category associations under Settings.
  - Added 56 realistic mishearing tests in `src/parser/__tests__/misheard.test.ts`.
- **PART C: On-Device Whisper Engine**:
  - Integration with `whisper.rn` and `expo-speech-recognition` audio persistence with 16 kHz mono 16-bit PCM WAV recording.
  - Implemented `WhisperSpeechService` implementing `SpeechService` interface.
  - Initial prompt bias: custom prompt injecting vocabulary, categories, and financial command patterns.
  - Model Manager (`src/speech/ModelManager.ts`): verified catalog of quantized ggml models (`tiny-q5_1`, `base-q5_1`, `small-q5_1`) from official whisper.cpp Hugging Face repository with sha256 checksums, resumable downloads, free space checks, and storage in app document directory.
  - Factory & Fallback (`src/speech/SpeechServiceFactory.ts`): automatically falls back to phone recognizer if Whisper model is missing or fails to initialize, with non-blocking user explanation.
  - Settings UI: engine toggle tabs ("Phone Recognizer" vs "Whisper"), model picker with download progress bars, deletion buttons, and language mode toggle ("English (en)" vs "Auto-detect").
  - Test suite expansion to 203 automated tests across 7 suites (`src/speech/__tests__/whisperEngine.test.ts`).

---

## [Phase 5: Backup, Builds, Verification] - 2026-10-04

### Added
- **Backup & Restore Subsystem**:
  - `src/backup/validation.ts`: Schema validator ensuring imported JSON matches `app: 'wini'`, `schemaVersion: 1`, validating all transaction/category/keyword fields, integer paise amounts, and ISO dates.
  - `src/backup/backupService.ts`: Exports `wini-backup-YYYY-MM-DD.json` using `expo-file-system/legacy` and `expo-sharing`; imports via `expo-document-picker`; restores data with `'merge'` or `'replace'`.
  - `src/ui/BackupModal.tsx`: Visual preview modal displaying transaction/category/keyword counts, formatted export date, and options for Merge or Replace.
  - Automated round-trip backup test suite (`src/backup/__tests__/backup.test.ts`) covering export, schema rejection, data corruption detection, complete wipe and replace, and timestamp-based merge.
- **Settings Screen Integration**:
  - Live Export and Import actions with haptic confirmations and error banners.
  - `last_backup_at` display formatted in Indian locale.
  - Prominent reminder banner triggering after 14 days without an export.
- **EAS Build & Release Setup**:
  - `eas.json` configured with `development` (internal distribution, dev client, APK) and `preview` (standalone internal APK).
  - `RELEASE_CHECKLIST.md`: Step-by-step instructions for `eas login`, build commands for development and preview APKs, installation, and physical handset test checklist.
  - Updated `README.md` with complete architecture guide, feature documentation, local running instructions, testing procedures, and EAS build workflow.
- **Code Quality & Tooling**:
  - Configured ESLint 9 flat config (`eslint.config.js`) supporting React 19 / React Compiler rules and strict TypeScript.
  - 130 / 130 automated tests passing across 5 suites.
  - 0 TypeScript compiler errors under strict mode (`npx tsc --noEmit`).
  - 0 ESLint errors and warnings across the entire codebase.

### Changed
- `package.json`: Added `expo-file-system`, `expo-document-picker`, `expo-sharing` dependencies.
- `app/settings.tsx`: Wired live backup actions and 14-day stale backup reminder.

### Verified
- Automated test suite passed with 130 tests across 5 test suites.
- TypeScript strict typecheck passed (`tsc --noEmit` exited with 0 errors).
- ESLint passed with 0 errors and 0 warnings (`eslint app src`).

### Known Gaps
- Physical Android device validation required for native file picker dialogs, system share sheet, microphone input, and on-device offline speech recognition.

---

## [Phase 4: Look and Feel] - 2026-10-04

### Added
- **Wallet-Style Stacked Cards**:
  - Implemented interactive card stack on Home using `react-native-reanimated` with spring physics.
  - Active card sits in front with deep drop shadow; peek cards ("Spent today" and "Income this month") sit behind and animate forward on tap with haptic feedback.
  - Added "Change vs last month" calculation chip (e.g. `↑ 12% vs last mo`, `↓ 5% vs last mo`, or `→ 0%`).
  - Added privacy eye toggle to mask balances (`••••••`) across all cards.
- **Insights Screen & Custom SVG Charts**:
  - Built pure `react-native-svg` daily spending bar chart with rounded tops, interactive day selection tooltip, and gradient shading.
  - Week (past 7 days) and Month (current month to date) toggle with animated metrics re-calculation.
  - Top categories breakdown with colored progress bars and percentage of total spend.
  - Key financial metrics cards: Daily Average Spend and Biggest Expense in period.
  - Friendly empty state with encouraging copy when no transactions are recorded for the period.
- **Docked Floating Mic Button**:
  - Centered floating circular mic button with Reanimated continuous pulsating glow ring.
- **Quick Action Glass Row**:
  - Semi-transparent glassmorphic action buttons for Voice Add (mic), Type Add (keyboard), Add Income (plus), and Insights shortcut.
- **Route Error Boundaries & Android Back Button**:
  - Wrapped every screen (`index`, `history`, `insights`, `settings`) in `ErrorBoundary`.
  - Added Android hardware `BackHandler` listeners that dismiss active modal sheets (`VoiceSheet`, `ConfirmSheet`, `TransactionModal`) before exiting the app.
- **UX & Accessibility Polishing**:
  - Enforced 48px minimum touch targets across all list rows, delete triggers, and buttons.
  - Integrated `expo-haptics` across card switching, delete, undo, and tab toggling.
  - Settings screen updated with Local Backup & Restore preview, `last_backup_at` display, and >14 days stale backup warning banner.

### Changed
- `src/domain/dates.ts`: Added `getPreviousMonthRange`, `getPast7DaysRange`, `formatDayShort`, and `getDateRangeList`.
- `src/state/useAppStore.ts`: Added `previousMonthTotals`, `changeVsLastMonthPercent`, and `getInsightsData`.
- `src/ui/icons.tsx`: Added `KeyboardIcon`, `ArrowTrendUpIcon`, `ArrowTrendDownIcon`, `ExportIcon`, `ImportIcon`.
- `app/_layout.tsx`: Removed unused placeholder tab route.

### Verified
- Automated test suite passed with 121 tests across 4 test suites.
- TypeScript strict typecheck passed (`tsc --noEmit` exited with 0 errors).
- UI layout responsive and tested for 360-412px widths with 0 overflow.

### Known Gaps
- Physical haptics and hardware back button behavior require validation on a physical Android handset.

---

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
