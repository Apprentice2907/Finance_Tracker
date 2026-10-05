# WINI v2 — Feature Spec ("Complete Personal Edition")

This file extends `WINI_PROJECT_BRIEF.md`. Where they conflict, this file wins for the v2 work. Read `DECISIONS.md`, `docs/HOW_IT_WORKS.md`, and `WINI_HANDOFF.md` (if present) first.

**Goal:** a calm, classic, fast personal finance app where the user can speak or type an expense in under two seconds, see exactly where money stands, keep private bank and card details on the phone, and never lose data.

---

## 0. Rules for the agent

1. **Checkpoint first:** `git tag pre-v2` and push it. Never force push. Commit and tag after every phase (`v2-phase-1` ... `v2-phase-9`) and `git push origin main --tags`.
2. **Do not run any `eas` command.** I run builds myself.
3. **Protect existing data.** The app already stores real entries on my phone. Database changes need a safe migration: snapshot first, run inside one SQL transaction, and a test that migrates a realistic v1 database fixture to v2 without losing or changing any row.
4. **Avoid new native packages when pure JavaScript will do.** A native package already crashed a build here (`expo-av` after it was removed from the SDK). Allowed native packages, each to be verified against the installed Expo SDK, React Native version, and New Architecture before use: `expo-secure-store`, `expo-local-authentication`, `expo-screen-capture`, `expo-clipboard`, `expo-task-manager` + `expo-background-task`, `expo-speech` (optional). Anything else needs a written reason in `DECISIONS.md`. If `npx expo-doctor` complains, stop and fix it before continuing.
5. **After every phase run `npm run prebuild-check`** (and make it pass), plus tests, typecheck, lint. Never delete or weaken existing tests. Test count must go up.
6. Keep the friendly beginner-comment style in code and keep `README.md`, `CHANGELOG.md`, `DECISIONS.md`, `docs/HOW_IT_WORKS.md`, and `RELEASE_CHECKLIST.md` current.
7. Be honest in reports: list what could not be verified without a real phone.

**Out of scope for this spec (separate prompts later):** hands-free "Hey Wini" wake word, Whisper fallback router, cloud sync / accounts / multi-user, multiple languages in the UI, SMS or bank reading.

---

## 1. Navigation and UI principles

- Keep the dark navy theme, tokens in `src/ui/tokens.ts`, phone portrait only (360–412 px).
- Bottom tabs: **Home · Accounts · Reports · Categories · Settings**. History is reached from Home ("See all"). Backup lives in Settings.
- A docked **composer bar** on Home (and a floating mic on other main tabs): see section 4.
- Every screen has: loading skeleton (no layout jump), friendly empty state, error banner with Retry, 48 px touch targets, safe areas, Android back closes sheets first.
- Numbers use Indian grouping (₹1,23,456). Money is integer paise internally.
- Motion is short and purposeful (under 250 ms), with haptics on save and delete.

---

## 2. Data model changes (schema v2)

Existing: `categories`, `transactions`, `keyword_map`, `settings`, `voice_log`, `user_corrections` (if present).

New / changed:
- `transactions.account_id` (nullable, FK). Default account setting decides what voice/typed entries use.
- `accounts`: `id, name, type ('bank'|'cash'|'wallet'|'investment'), institution, opening_balance_paise, current_value_paise (investments only, manual), valuation_updated_at, include_in_total, sort_order, aliases_json (spoken names), created_at, updated_at, deleted_at`.
- `account_valuations`: `id, account_id, value_paise, recorded_on, created_at` (history for investments).
- `categories`: add `is_system` (for "Other" and "Other income"), keep `kind`, `emoji`, `color`, `sort_order`.
- `vault_bank` and `vault_cards` (section 6). Sensitive columns stored as encrypted blobs.
- `app_settings` keys: `auto_add_mode`, `auto_add_limit_paise`, `default_account_id`, `quarter_basis` ('calendar'|'indian_fy'), `backup_auto`, `backup_format`, `backup_folder_uri`, `last_backup_at`, `backup_keep_count`, `allow_sensitive_card_fields`, `speech_silence_ms`.
- **Balance rule:** for `bank`, `cash`, `wallet`: `opening_balance + Σ income − Σ expense` of non-deleted transactions linked to the account. For `investment`: the manual `current_value_paise` (not derived from transactions).
- Keep UUIDs, `created_at`, `updated_at`, `deleted_at` everywhere. Add repository methods and tests for all queries below.

---

## 3. Home (Dashboard)

Everything on Home is for the **selected month only** (default: current month). A month switcher at the top (◀ October 2026 ▶; cannot go into the future).

1. **Three summary cards:** *Net balance* (income − expense, green or red), *Total income*, *Total expense*. Tapping a card opens Reports for that month.
2. **Cashflow chart:** daily income vs expense bars for the month, a faint cumulative net line, and tap-a-day tooltip with amounts. Works for empty or one-day months.
3. **Category breakdown:** segmented toggle **Expense | Income**, donut chart with the total in the centre, legend with amount and percentage. Tapping a slice or legend row opens History filtered to that category and month.
4. **Recent 5 transactions** (latest five overall): emoji, note, category, account chip, amount, relative date; "See all" opens History. Swipe to delete with Undo.
5. **Composer bar** (section 4) is docked at the bottom.

---

## 4. Voice and typing experience

### 4.1 Composer
- Segmented control **🎙 Speak | ⌨ Type**, remembering the last choice. In Speak mode: big mic button (tap to start, tap to stop, auto-stop on silence). In Type mode: text field + send button. Both use the **same** parser pipeline.
- Optional account phrases: "from cash", "from HDFC" resolve through `accounts.aliases_json`; no match uses the default account.

### 4.2 Auto-add (so it feels like an assistant)
Setting **Add behaviour** (default **Auto-add when sure**):
- *Ask me every time*: always show the confirm card.
- *Auto-add when sure*: save immediately when ALL of these hold: parser confidence ≥ 0.9, amount found, category resolved, amount ≤ the auto-add limit (default ₹2,000, editable), and the date is within the last 7 days. Otherwise show the confirm card.
- *Always auto-add*: only the card is skipped; low-confidence results still open the pre-filled edit form.
After an auto-add show a snackbar for 8 seconds: "Added ₹10 · Transport · Today" with **Undo** and **Edit**. Haptic on save. Optional spoken confirmation (off by default).

### 4.3 Latency (feeling instant)
Targets, measured on my phone, not guarantees: tap → "Listening" visible ≤ 250 ms; end of speech → saved or card shown ≤ 500 ms on the phone-recognizer path.
Techniques to apply and verify:
- Warm up the recognizer when the Home screen gains focus; request permissions up front.
- Parse interim (partial) results and pre-fill the card early; finalize on the final result.
- Silence timeout setting (`speech_silence_ms`, default about 1000 ms).
- Optimistic UI: update the store immediately, write to SQLite right after, roll back on failure.
- Prepared/batched SQL, memoized selectors, list virtualization, no full-screen re-render on each save.
- Never load Whisper unless it is needed.
Instrumentation: store timestamps for tap, recognizer start, first partial, final result, parsed, saved, and UI updated in `voice_log.timings_json`. Voice Lab shows median and p95 for the last 50 attempts.

### 4.4 Voice Check ("model check")
Settings → **Voice Check**: shows one phrase at a time from the list in the Appendix, I read it aloud, and the screen shows: heard text, parsed result vs expected (type, amount, category, date, account), pass or fail, and latency. At the end: pass rate, average latency, and the worst words, per engine. Export results as JSON/CSV.
Also add a Jest test that feeds every Appendix phrase to the parser as perfect text, so parser gaps are separated from recognition errors. Fix parser gaps without weakening existing tests.

---

## 5. Accounts

Top summary: **Total** (all included accounts), then three tiles: **Bank**, **Cash**, **Investments**. Below, accounts grouped by type as stacked wallet-style cards.
- Add/edit/archive (soft delete) accounts; fields: name, type, institution, opening balance (or current value for investments), spoken aliases, include in total.
- **Investments** (for example "Angel One ₹2,50,000"): "Update value" records a new valuation (history kept), shows last updated date and change since the previous value.
- Account detail: balance, recent transactions for that account, and (for investments) the valuation history.
- Default account setting (initially Cash).

---

## 6. Vault (private bank and card details)

Lives inside Accounts as a lock icon. Opens only after biometric or device-credential unlock (`expo-local-authentication`). Local-only.

**Bank details:** account holder name, bank name, account number, IFSC, net-banking / customer ID, UPI ID, branch, notes.
**Cards:** nickname, network (Visa/Mastercard/RuPay/Amex/other), holder name, card number, expiry, optional CVV, optional PIN, linked bank account, billing day.

Security rules (mandatory):
- AES-256-GCM, random IV per record, authenticated (tamper-detected). The data key is generated once and kept in the Android Keystore through `expo-secure-store`. Prefer a pure-JavaScript crypto library (for example `@noble/ciphers`) over a native one, after checking bundle compatibility.
- **CVV and PIN are optional fields**, shown only when "Allow storing CVV/PIN" is switched on in Vault settings, with a plain-language warning ("anyone who can unlock your phone and pass biometrics could see these"). A build constant `ALLOW_SENSITIVE_CARD_FIELDS` defaults to true for my personal build and must be easy to set to false for any public release (PIN storage is a high risk; I will probably remove it before releasing publicly).
- Everything masked by default (•••• 4417). Reveal needs a fresh biometric check (valid for 30 s) and re-hides after 10 s. Copy-to-clipboard clears after about 30 s (best effort; note the Android limitation in the UI).
- Block screenshots and the recents preview on vault screens (`expo-screen-capture`). Re-lock after 30 s in the background. Rate-limit failed unlocks. "Wipe vault" action with confirmation.
- Vault fields never appear in: logs, `voice_log`, error banners, JSON/CSV/XLSX exports, or any sync code. They may appear in a backup **only** inside the encrypted backup when I tick "Include vault".
- Tests: encryption round trip, tampered ciphertext is rejected, masked rendering, no vault field in plain exports, no vault field in log calls.

---

## 7. Reports

- Period selector **Week | Month | Quarter | Year | Custom**, with ◀ ▶ navigation. Quarter basis is a setting (calendar or Indian financial year Apr–Mar).
- Summary: total income, total expense, net, savings rate, each compared with the previous period (amount and %).
- Cashflow chart: bars per day (week, month) or per month (quarter, year).
- **Category analysis:** Expense | Income toggle; ranked list with amount, share %, count, average, and a bar; donut optional. Tap → filtered History.
- **Insights** (deterministic, no AI): 3–5 plain sentences such as "Food was your biggest expense: ₹X (32%)", "You spent 18% more on Transport than last month", busiest spending day, average per day, most frequent note.
- Top 5 largest transactions. Export the current period as CSV.
- All numbers are computed in the Repository with tests, including week/month/quarter/year boundaries and Indian FY quarters.

---

## 8. Categories

Tabs **Expense | Income**. Add, rename, change emoji and color, reorder, delete.
- Names unique per kind (case-insensitive). Cannot delete the last category of a kind or a `is_system` category.
- Deleting a category that has transactions opens "Move N transactions to…" (default Other) and then soft-deletes it.
- Each category has a keywords screen (built-in and learned words) where I can add or remove words.

---

## 9. Backup, import, export

**Backup & Restore** (in Settings):
- Status card: last backup date and time, file size, format, result (success/failed), and the next due date.
- **Back up now**, and **Auto backup monthly** (default on). Honest behaviour: Android cannot guarantee exact background timing. So: when the app opens, if a backup is due (30+ days or a new calendar month), create it automatically; also register a best-effort background task (`expo-background-task`). Save into a folder I pick once (Android Storage Access Framework, verify the installed API); if no folder is chosen, save to private app storage and show a prompt to share it. Keep the last N copies (default 6).
- **Formats:** CSV (UTF-8, one file per table, zipped or shared separately), Excel `.xlsx` (sheets: Transactions, Categories, Accounts, Valuations; **no vault data**), Encrypted `.wini` (full backup JSON encrypted with AES-256-GCM using a key derived from my passphrase with scrypt or PBKDF2; versioned header; passphrase never stored; warn that a forgotten passphrase cannot be recovered; optional "Include vault").
- Choose a maintained pure-JavaScript library for `.xlsx` if possible; verify it bundles under Metro. CSV is mandatory.
- Spreadsheet formula-injection guard: cells starting with `=`, `+`, `-`, `@`, tab, or carriage return are prefixed on export.
- **Import:** pick `.csv`, `.xlsx`, `.wini`, or the old `.json`. Detect type, validate, then a column-mapping step for CSV/XLSX (date, amount, type, category, note, account; day-first dates by default for India), preview of the first rows plus counts and errors. **Nothing is written until I confirm.** Choose Merge (dedupe by id; for files without ids, by date+amount+note) or Replace. Run in one SQL transaction, and keep a pre-import snapshot with an "Undo import" option.
- Tests: export → wipe → import round trip for every format, wrong passphrase, corrupted file, injection strings, CSV with Indian date formats and rupee symbols, and duplicates on merge.

---

## 10. Settings screen

Add behaviour (auto-add mode and limit), default account, quarter basis, voice engine and silence timeout, Voice Check and Voice Lab, corrections list, learned keywords, vault settings, backup, theme, about/version.

---

## 11. Phases and acceptance

| Phase | Work | Done when |
|---|---|---|
| 1 | Schema v2, migration with snapshot, repository methods, tests | A v1 fixture database migrates with zero data change; all new queries tested |
| 2 | Navigation, Home dashboard, composer shell (Speak/Type) | Home shows the five blocks for any month, empty states included |
| 3 | Auto-add + Undo/Edit snackbar, latency instrumentation, Voice Check, parser fixes | Voice Check runs end to end; all Appendix phrases parse correctly as text; timing visible in Voice Lab |
| 4 | Accounts and investments | Balances follow the rule in section 2; valuation history works |
| 5 | Vault | All security rules in section 6 hold and are tested |
| 6 | Reports | All periods and Indian FY quarters tested; insights correct |
| 7 | Categories | Delete-with-move works; guards enforced |
| 8 | Backup, import, export, monthly auto | Round trips pass for every format; auto backup triggers when due |
| 9 | Polish, docs, release checklist | `RELEASE_CHECKLIST.md` updated with a phone test list for every feature; final report |

Final report must include: commit hashes and tags, test counts, the result of `npm run prebuild-check`, a list of new native packages with the reason for each, what could not be verified without a real phone, and the command to run next: `npx eas build --profile preview --platform android` (answer "n" to the emulator question).

---

## Appendix: Voice Check phrases

Expected values: type, amount, category, date offset (days), optional account. "Account" phrases need an account with that alias to exist.

| # | Phrase | Type | Amount ₹ | Category | Date |
|---|---|---|---|---|---|
| 1 | add 10 rupees rickshaw | expense | 10 | Transport | 0 |
| 2 | rickshaw 10 | expense | 10 | Transport | 0 |
| 3 | add rickshaw 10 rupees | expense | 10 | Transport | 0 |
| 4 | auto 40 | expense | 40 | Transport | 0 |
| 5 | metro 30 | expense | 30 | Transport | 0 |
| 6 | uber 250 airport | expense | 250 | Transport | 0 |
| 7 | ola 180 | expense | 180 | Transport | 0 |
| 8 | rapido 60 | expense | 60 | Transport | 0 |
| 9 | petrol 500 | expense | 500 | Transport | 0 |
| 10 | chai 20 | expense | 20 | Food | 0 |
| 11 | shake 80 | expense | 80 | Food | 0 |
| 12 | milkshake 120 | expense | 120 | Food | 0 |
| 13 | add lunch 150 | expense | 150 | Food | 0 |
| 14 | swiggy 320 | expense | 320 | Food | 0 |
| 15 | zomato 450 | expense | 450 | Food | 0 |
| 16 | blinkit 280 | expense | 280 | Food | 0 |
| 17 | zepto 199 | expense | 199 | Food | 0 |
| 18 | bigbasket 1200 | expense | 1200 | Food | 0 |
| 19 | biryani 220 | expense | 220 | Food | 0 |
| 20 | dinner 600 yesterday | expense | 600 | Food | -1 |
| 21 | amazon 799 | expense | 799 | Shopping | 0 |
| 22 | flipkart 1499 | expense | 1499 | Shopping | 0 |
| 23 | myntra 899 | expense | 899 | Shopping | 0 |
| 24 | shoes 2k | expense | 2000 | Shopping | 0 |
| 25 | netflix 199 | expense | 199 | Fun | 0 |
| 26 | spotify 119 | expense | 119 | Fun | 0 |
| 27 | movie 350 | expense | 350 | Fun | 0 |
| 28 | jio recharge 299 | expense | 299 | Bills | 0 |
| 29 | airtel recharge 399 | expense | 399 | Bills | 0 |
| 30 | electricity bill 1850 | expense | 1850 | Bills | 0 |
| 31 | rent 15000 | expense | 15000 | Bills | 0 |
| 32 | wifi 700 | expense | 700 | Bills | 0 |
| 33 | emi 5200 | expense | 5200 | Bills | 0 |
| 34 | medicine 240 | expense | 240 | Health | 0 |
| 35 | doctor 500 | expense | 500 | Health | 0 |
| 36 | gym 1500 | expense | 1500 | Health | 0 |
| 37 | dedh sau chai | expense | 150 | Food | 0 |
| 38 | dhai sau petrol | expense | 250 | Transport | 0 |
| 39 | do hazaar rent | expense | 2000 | Bills | 0 |
| 40 | paanch sau groceries | expense | 500 | Food | 0 |
| 41 | das rupaye chai | expense | 10 | Food | 0 |
| 42 | kal 100 petrol | expense | 100 | Transport | -1 |
| 43 | parso 50 metro | expense | 50 | Transport | -2 |
| 44 | 1.5 lakh hospital | expense | 150000 | Health | 0 |
| 45 | got 5000 salary | income | 5000 | Income | 0 |
| 46 | salary 50000 credited | income | 50000 | Income | 0 |
| 47 | received 500 cashback | income | 500 | Income | 0 |
| 48 | chai 20 from cash | expense | 20 | Food | 0 (account: Cash) |
| 49 | paid 1250 from hdfc electricity | expense | 1250 | Bills | 0 (account: HDFC) |
| 50 | 2 chai 20 rupees | expense | 20 | Food | 0 |
