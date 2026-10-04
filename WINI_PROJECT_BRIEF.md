# WINI — Project Brief (v1: personal, phone-only, local-first)

You are a senior React Native engineer working inside this repository (the old "Finance Tracker" Flet project). Read this whole file, then execute the phases in order. This file is the source of truth. If something here conflicts with an old file in the repo, this file wins.

---

## 1. Product in one paragraph

**Wini** is a voice-first personal expense tracker for ONE user (the owner). The owner taps a mic button and says "add 10 rupees rickshaw" or "add rickshaw 10 rupees" or "kal 100 petrol". The app extracts the amount (10 rupees), category (Transport), note (rickshaw) and date (today, India time), shows a one-tap confirmation card, and saves. Everything works offline, on the phone. The UI is fun, creative, simple and clean, dark-navy, wallet-style, phone portrait only.

## 2. Scope

### In scope (v1)
- Android phone app, Expo (React Native) + TypeScript (strict).
- Local SQLite storage. No login, no server, no cloud.
- Manual add / edit / delete of expenses and income.
- Rule-based voice-sentence parser (English, Hinglish, Indian number words).
- Voice input through the phone's speech recognizer, plus a "type instead" box using the same parser.
- Home (wallet-style), History, Insights, Settings screens.
- Learned keywords: when I fix a category once, the app remembers that word for next time.
- Backup: export / import one JSON file.
- Development build + installable APK for my own phone.

### Out of scope (do NOT build now)
- Accounts, login, Supabase, PocketBase, any network backend.
- Offline Whisper, local LLM, wake word "Hey Wini".
- Cards/bank vault.
- Web or tablet layouts. Phone portrait only.
- Multiple users, sharing, notifications, bank/SMS reading.

Leave clean seams for these (see section 5), but write no code for them.

## 3. Rules of engagement for the agent

- You may **create, update, and delete files and folders inside this repository** to complete the work. Never touch anything outside the repository folder.
- **Checkpoint first** (Phase 0). Never delete `.git`. Never use `git push --force`. Never commit secrets, `node_modules`, `*.db`, or build output.
- Work in small, working increments. Commit after every phase with a clear message.
- Verify before claiming done: typecheck, lint, tests. Fix failures, do not hide them.
- No TODO placeholders, no silent `catch` blocks, no fake/mock data in production code paths. Every failure shows a friendly message and is logged locally.
- Don't ask me questions unless truly blocked. If something is ambiguous, choose the safest simple option, write the assumption in `DECISIONS.md`, and continue.
- Verify library APIs against the installed version's docs/types; do not rely on memory for APIs. Use `npx expo install` so versions match the Expo SDK.
- Original artwork only. Reference screenshots are inspiration for layout ideas, never to be copied.

## 4. Tech stack (fixed)

| Area | Choice |
|---|---|
| Framework | Expo (latest stable SDK), React Native, TypeScript strict |
| Navigation | expo-router |
| Database | expo-sqlite (use the current async API), migrations via `PRAGMA user_version` |
| Speech | `expo-speech-recognition` behind a `SpeechService` interface (prefer on-device recognition, language `en-IN`; fall back to online recognition if the offline pack is missing; handle permission denial) |
| Animations | react-native-reanimated, expo-haptics |
| Charts | custom SVG with react-native-svg (no heavy chart library) |
| Tests | Jest (+ jest-expo where needed). Parser, money, repository logic must be testable in plain Node |
| Builds | expo-dev-client, EAS Build (development + preview APK profiles) |
| Lint/format | ESLint + Prettier, `tsc --noEmit` |

Because native modules are used, the app runs as a **development build, not Expo Go**.

## 5. Architecture and "scale later" seams

```
app/                  expo-router screens (thin; no business logic)
src/
  db/                 schema, migrations, Repository (the ONLY place that touches SQLite)
  domain/             money.ts, dates.ts, types.ts, categories.ts
  parser/             parseUtterance(), number words, keyword map, learned keywords
  speech/             SpeechService interface + ExpoSpeechService
  backup/             export/import JSON, validation
  ui/                 design tokens, components, charts, theme
  state/              lightweight store (zustand) built on Repository
```

Seams that make scaling later cheap (build these now, they cost almost nothing):
- **Repository** is the single data gateway. Later, sync plugs in here.
- Every row has `id` (UUID created on the phone), `created_at`, `updated_at`, `deleted_at` (soft delete), and transactions also have `device_id`.
- **Money is integer paise**, never floats.
- `SpeechService` interface, so Whisper can replace the system recognizer later.
- `Parser` is a pure function, so an LLM fallback can wrap it later.
- No vault, sync, or auth code now. Just keep the layers clean.

## 6. Data model

All ids are UUID v4 strings. All timestamps are ISO-8601 UTC strings. `occurred_on` is a local India date `YYYY-MM-DD`.

**categories**: `id, name, emoji, color, kind ('expense'|'income'), sort_order, created_at, updated_at, deleted_at`
Defaults (seeded once): Food 🍔, Transport 🛺, Shopping 🛍️, Bills 🧾, Health 💊, Fun 🎉, Other ✨ (expense); Income 💰 (income).

**transactions**: `id, type ('expense'|'income'), amount_paise INTEGER CHECK(amount_paise > 0), category_id, note, occurred_on, source ('voice'|'typed'|'manual'), raw_text, device_id, created_at, updated_at, deleted_at`
Indexes: `(occurred_on)`, `(category_id)`, `(deleted_at)`.

**keyword_map** (learned words): `id, word (lowercase, unique), category_id, created_at, updated_at`

**settings**: `key, value` (theme, device_id, onboarding_done, last_backup_at).

Rules: deletes are soft. All queries exclude `deleted_at IS NOT NULL`. Repository exposes typed functions (add, update, softDelete, undoDelete, listByDay, totals by period, totals by category, search).

## 7. Parser specification

`parseUtterance(text: string, now: Date, tz = "Asia/Kolkata", keywords: KeywordMap) -> ParseResult`

```
ParseResult = {
  type: 'expense' | 'income',
  amountPaise: number | null,
  category: string | null,   // category name
  note: string,
  date: string,              // YYYY-MM-DD in tz
  confidence: number,        // 0..1
  matchedKeyword?: string
}
```

Must never throw. Garbage input returns low confidence and `amountPaise: null`.

**Amount:** digits ("10", "1,250", "250.50"), suffixes ("2k", "1.5k", "2 lakh"), currency words/symbols ("rupees", "rs", "rs.", "₹", "rupaye", "rupiya", "bucks"), English number words ("ten", "twenty five", "one hundred fifty", "two thousand"), Hindi number words (ek, do, teen, char, paanch, chhe, saat, aath, nau, das, bees, pachas, sau, hazaar). Handle word order both ways ("rickshaw 10", "10 rickshaw").

**Type:** income if the sentence contains got, received, credited, earned, salary, mila, aaya, refund; otherwise expense.

**Date (default today in Asia/Kolkata):** today/aaj → today; yesterday/kal/"last night" → yesterday; parso/"day before yesterday" → two days ago; weekday names → the most recent past occurrence; "N days ago". ("kal" is ambiguous in Hindi; for expense logging treat it as yesterday.)

**Category:** learned keywords first, then the built-in map, e.g.:
- Transport: rickshaw, auto, metro, bus, train, uber, ola, rapido, cab, petrol, diesel, fuel, parking, toll
- Food: chai, tea, coffee, lunch, dinner, breakfast, snacks, swiggy, zomato, groceries, vegetables, milk, biryani, pizza
- Shopping: shirt, shoes, amazon, flipkart, myntra, clothes
- Bills: rent, electricity, recharge, wifi, internet, bill, emi
- Health: medicine, doctor, pharmacy, hospital, gym
- Fun: movie, game, netflix, party, trip
- Income: salary, stipend, refund, cashback, got paid
Unknown word → category null (the confirm card asks; the choice is saved to `keyword_map`).

**Note:** the leftover meaningful words after removing the amount, currency words, command words ("add", "spent", "paid", "for", "on"), and date words. Title-case it ("Rickshaw").

**Confidence:** high only when amount AND category are found; medium when the amount is found without a category; low otherwise.

### Required acceptance cases (turn these into Jest tests; add 40+ more including garbage)

| Input | Amount (₹) | Category | Type | Date |
|---|---|---|---|---|
| add 10 rupees rickshaw | 10 | Transport | expense | today |
| add rickshaw 10 rupees | 10 | Transport | expense | today |
| rickshaw 10 | 10 | Transport | expense | today |
| 10 rs chai | 10 | Food | expense | today |
| spent 250 on lunch yesterday | 250 | Food | expense | yesterday |
| got 5000 salary | 5000 | Income | income | today |
| ten rupees auto | 10 | Transport | expense | today |
| das rupaye chai | 10 | Food | expense | today |
| kal 100 petrol | 100 | Transport | expense | yesterday |
| parso 50 metro | 50 | Transport | expense | day before yesterday |
| paid 1,250 rent | 1250 | Bills | expense | today |
| 2k shoes | 2000 | Shopping | expense | today |
| asdf qwerty | null | null | expense | today (low confidence) |

## 8. Voice flow

1. User taps the big mic button → permission check → listening state (waveform/pulse, live partial transcript).
2. Tap again (or silence timeout) → final transcript.
3. `parseUtterance` → **Confirm sheet**: amount, category chip, date, note, "heard: …" text, buttons Save / Edit / Cancel.
4. If confidence is low, open the edit form pre-filled instead of failing.
5. Save → haptic → message "Added ₹10 for Transport." → Home updates immediately.
6. If the user changes the category for an unknown word on the confirm sheet, store it in `keyword_map`.
7. A "type instead" input uses the exact same pipeline, so the app is fully usable without a mic.

Edge cases: mic permission denied (explain how to enable, offer typing), no speech detected, recognizer unavailable, recognition error, offline language pack missing.

## 9. UI / UX specification

**Look:** dark navy, one bright accent, big readable numbers, rounded cards, soft glass-like buttons, one playful touch (a small animated mic pulse). Inspired by modern fintech wallet apps; draw original shapes, icons and layout.

**Design tokens** (single file `src/ui/tokens.ts`):
- Background `#0A0F1E`, surface `#121A30`, elevated `#1A2442`
- Primary accent `#3B6EF5`, income `#2ECC8F`, expense `#FF6B7A`, warning `#FFC857`
- Text `#F2F5FF`, muted `#8A94AD`
- Radii 16/24, spacing scale 4/8/12/16/24/32
- Fonts: a display serif for big numerals (for example Fraunces or DM Serif Display) and Inter for body, loaded through expo-google-fonts, with system fallbacks.

**Screens:**
1. **Home**
   - Header: greeting, avatar placeholder.
   - **Stacked wallet card**: main card = "This month spent" (large number, show/hide eye icon, change vs. last month as a chip); two smaller cards peek out behind it ("Today", "Income this month"). Animated stacking.
   - Quick actions row (glass buttons): Voice add, Type add, Add income, More.
   - Recent entries list (emoji, note, category, amount, time), swipe to delete with Undo snackbar.
   - Big centered mic button docked at the bottom.
2. **History**: grouped by day, search, filter by category and type, edit on tap.
3. **Insights**: week/month toggle, bar chart of daily spend, top categories (donut or bars with percentages), average per day, biggest expense.
4. **Settings**: theme (dark/light optional), manage categories and learned keywords, export/import backup, about/version.

**Quality bar:** works at 360–412 px width, no overflow or clipped text, 48 px touch targets, safe-area aware, keyboard-safe sheets, Android back button closes sheets first, empty states with friendly copy, loading states, haptics on save, errors as in-app banners (never a red crash screen). Use an error boundary on every route.

## 10. Backup / restore

- **Export:** one JSON file `wini-backup-YYYY-MM-DD.json` through the system share/save dialog.
```
{ "app": "wini", "schemaVersion": 1, "exportedAt": "...", "deviceId": "...",
  "categories": [...], "transactions": [...], "keywordMap": [...] }
```
- **Import:** validate with a schema (reject unknown versions or malformed data with a clear message), preview counts, let me choose **Merge** (by id, newest `updated_at` wins) or **Replace** (with confirmation).
- A round-trip test (export → wipe → import → identical data) must pass.
- Settings shows `last_backup_at` and a gentle reminder if the last backup is over 14 days old.

## 11. Phases (execute in order; commit after each)

### Phase 0 — Safety checkpoint and clean slate
1. Run `git status`. If the working tree has uncommitted changes, commit them as "Final Flet state before rewrite".
2. Create tag `flet-final` and a branch `legacy-flet` pointing at the current commit (do not push anything destructive).
3. Remove the old Flet project from the working tree: `main.py`, `charts/`, `db/`, `views/`, `utils/`, `tests/`, `benchmarks/`, `docs/`, `venv/`, `requirements.txt`, the Flet `pyproject.toml`, Python caches, any `*.db` files, and the old Flet APK workflow `.github/workflows/build-apk.yml` (it would fail on every push). **Keep:** `.git`, `.gitignore` (update it), `LICENSE` if present, and this `WINI_PROJECT_BRIEF.md`.
4. Initialize the Expo project in the repository root (not a subfolder) with TypeScript and expo-router. Replace the README with a short Wini README. Create `DECISIONS.md`.
5. Update `.gitignore` for Node/Expo/Android (node_modules, .expo, dist, android/ios build outputs, `*.db`, `*.jks`, `.env*`).
6. Commit: "Start Wini: replace Flet app with Expo React Native".

### Phase 1 — Foundation and manual entry
Structure from section 5, design tokens, theme provider, SQLite schema + migrations + seed categories, Repository, state store, manual add/edit/delete, History list grouped by day, error boundaries.
**Done when:** I can add, edit, delete (with undo) an entry by hand, close the app, reopen it, and the data is still there. Repository Jest tests pass.

### Phase 2 — Parser (pure TypeScript, before any voice work)
Implement section 7. At least 50 Jest tests, including all acceptance cases, garbage input, boundary dates (midnight IST, month/year boundaries), and learned-keyword override.
**Done when:** `npm test` is green and every acceptance case passes.

### Phase 3 — Voice and confirm flow
Implement section 8 with `SpeechService`, permission handling, mic UI, confirm sheet, type-instead box, learned keywords.
**Done when:** on my phone, saying "add rickshaw 10 rupees" produces a correct confirm card in a few seconds and saving updates Home.

### Phase 4 — Look and feel
Implement section 9: wallet header with stacked cards, quick actions, Insights charts, Settings, animations, haptics, empty/loading states.
**Done when:** every screen is usable at 360 px width without overflow, and the app feels smooth.

### Phase 5 — Backup, builds, verification
Section 10 backup/restore, EAS profiles (`development`, `preview` APK), non-interactive build scripts, README with run/build steps.
Run `tsc --noEmit`, ESLint, and all tests. Fix everything.
**Final report must include:** what was verified, what could NOT be verified without a real device (mic, on-device recognition, haptics, back button), assumptions in `DECISIONS.md`, and a manual phone test checklist.

## 12. Definition of done (v1)

- [ ] Typecheck, lint, tests all green.
- [ ] All parser acceptance cases pass.
- [ ] Add by voice, by typing, and manually all work on a real phone.
- [ ] Data survives app restarts; backup export → import round trip works.
- [ ] No red crash screens: every route has an error boundary.
- [ ] Installable APK (preview profile) runs on my phone.
- [ ] README explains how to run, test, and build.

## 13. Later (for context only — do not build)

- **v1.5:** offline Whisper (`WhisperSpeechService`), local LLM fallback for messy sentences, wake word "Hey Wini", local-only encrypted vault for cards/bank details (CVV not stored by default), budgets.
- **v2:** accounts and cloud sync for friends (Supabase or PocketBase behind a `SyncProvider`), invite-only access, GitHub Releases distribution.
