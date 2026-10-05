# 🔍 How Wini Works: A Beginner's Walkthrough

Welcome! If you are learning Android, React Native, or TypeScript, this guide walks you through
the entire lifecycle of a voice command in Wini—from the moment your thumb taps the mic to the
moment the expense is safely committed into SQLite on your device.

---

## 🎙️ The Life of a Voice Command ("add 10 rupees rickshaw")

Here is the exact journey through Wini's codebase:

```
[User Taps Mic]
       ↓
1. app/index.tsx                       → Floating mic button opens VoiceSheet
       ↓
2. src/speech/SpeechServiceFactory.ts   → Selects engine: Phone Recognizer or Whisper
       ↓                                 (checks model availability, falls back gracefully)
3. SpeechService.startListening()       → Phone Recognizer (biased hints) OR Whisper (16kHz WAV + local model)
       ↓ (Audio → ["add 10 rupees rickshaw", "at 10 rupees rickshaw"])
4. src/parser/parseUtterance.ts        → parseBestAlternative():
                                          - Normalizes mishearings & phonetic typos (chay -> chai)
                                          - Disambiguates number homophones (for -> 4)
                                          - Applies conservative fuzzy keyword matching
                                          - Evaluates all alternatives and picks highest confidence candidate
       ↓
5. src/ui/ConfirmSheet.tsx             → Shows parsed card: ₹10, Transport, Today
       ↓ (User confirms or edits)
6. src/db/repository.ts (voice_log)    → Logs evaluation pair: heard text, parsed JSON, final values, corrected flag
       ↓ (User taps "Save")
7. src/state/useAppStore.ts            → Zustand store action adds transaction
       ↓
8. src/db/repository.ts                → Writes row into local phone SQLite
       ↓
[Screen Updates & Haptic Buzz!]
```

---

### Step-by-Step Code Walkthrough

### 1. The Trigger (`app/index.tsx`)
When you tap the big floating mic button at the bottom of the Home screen:
- State `isVoiceSheetVisible` is set to `true`.
- The `<VoiceSheet />` modal slides up from the bottom.

### 2. Engine Selection & Speech Recognition (`SpeechServiceFactory.ts`, `ExpoSpeechService.ts`, `WhisperSpeechService.ts`)
- `VoiceSheet` asks `createSpeechService()` to instantiate the active engine:
  - **Phone Recognizer (`ExpoSpeechService`)**: Talks to Android's built-in recognizer, injecting contextual biasing strings (categories, Hindi/English numerals, learned keywords).
  - **On-Device Whisper (`WhisperSpeechService`)**: Records 16 kHz mono 16-bit PCM WAV audio via `expo-speech-recognition` audio persistence, passes an initial vocabulary prompt, and transcribes locally on the CPU using a quantized GGML model (e.g. `base-q5_1`).
- *What if the Whisper model isn't downloaded yet?* `SpeechServiceFactory` automatically falls back to the Phone Recognizer with a friendly banner so your voice command never fails!
- Recognizer returns final transcript along with alternative candidates and timing latency.

### 3. The Brain: Natural Language Parsing & Mishearing Recovery (`src/parser/`)
The parser is a **pure function** (`parseUtterance`), meaning text in, object out, with zero phone or network dependencies:
- **Multi-alternative selection (`parseBestAlternative`)**: If the recognizer returns multiple guesses, the parser runs across all candidates and picks the one with the highest confidence score.
- **Mishearing normalization (`src/parser/misheard.ts`)**:
  - Phonetic normalization: converts common speech typos (`chay` -> `chai`, `ricksha` -> `rickshaw`, `metor` -> `metro`).
  - Homophone disambiguation: words like "to", "too", "for", "won", "ate" are only interpreted as numbers when adjacent to a currency word or known item token.
  - Conservative fuzzy matching: uses Damerau-Levenshtein distance (edit distance 1-2 on tokens >= 4 letters) strictly in Category Resolution (Step 5) when no exact keyword match exists.
  - Devanagari transliteration: maps Hindi script numerals (१, २, १०) and currency/date words to Romanized equivalents.
- **Amount extraction**: Looks for numbers, multipliers (`k`, `lakh`), and words (`das`, `ten`). It scores candidates so `"2"` in `"2 chai 20 rupees"` is treated as a quantity, not the price.
- **Date extraction**: Recognizes `"today"`, `"kal"` (yesterday in Hindi), `"parso"`, and weekdays.
- **Category matching**: Compares words against keyword lists. `"rickshaw"` matches `Transport`!
- **Note creation**: Cleans up leftover words into a readable title (`"Rickshaw"`).

Result:
```ts
{
  amountPaise: 1000,           // 1000 paise = ₹10.00
  type: 'expense',
  categoryId: 'cat_transport', // Matched "rickshaw"
  dateStr: '2026-10-04',
  note: 'Rickshaw',
  confidence: 0.95
}
```

### 4. User Verification & Ground Truth Logging (`src/ui/ConfirmSheet.tsx`)
Wini never silently saves an entry without letting you see it first.
- The confirm bottom sheet shows: **₹10**, **Transport**, **Today**, Note: **Rickshaw**.
- If the confidence was low (e.g. muddled audio), it opens the full edit form instead.
- **Correction Logging**: If you adjust the category or amount before tapping Save, Wini logs the pair to `voice_log` with `corrected: true` (only text is stored, never audio).
- *Did you pick a new category for an unknown word?* Wini automatically saves it into
  `keyword_map` in SQLite so it remembers next time!

### 5. Storing the Money (`src/state/useAppStore.ts` & `src/db/repository.ts`)
- The Zustand store calls `repo.addTransaction(...)`.
- `SqliteRepository` generates a unique UUID and inserts a row into SQLite:
  ```sql
  INSERT INTO transactions (id, amount_paise, type, category_id, date, note, ...)
  VALUES ('tx_123', 1000, 'expense', 'cat_transport', '2026-10-04', 'Rickshaw', ...);
  ```
- Notice `amount_paise = 1000`! We **never store decimals like 10.50** because floating point
  math can cause rounding errors (e.g. `0.1 + 0.2 = 0.30000000000000004`). Paise integers keep
  every single coin exact.

### 6. The UI Updates Reactively
- Zustand notifies React components that data has changed.
- The **This Month** card, **Spent Today** card, and **Recent Entries** list instantly update.

---

## 🧭 "Where do I change X?" Cheat Sheet

Want to tweak Wini? Here is where to look:

| What you want to do | File to edit | What to look for |
|---|---|---|
| **Add a new default category** | `src/domain/categories.ts` | Add to `DEFAULT_CATEGORIES` array |
| **Teach Wini a new food or slang word** | `src/parser/categories.ts` | Add to `DEFAULT_CATEGORY_KEYWORDS` |
| **Change the app colors or spacing** | `src/ui/tokens.ts` | Edit `colors`, `radii`, or `spacing` |
| **Add or change icons** | `src/ui/icons.tsx` | Pure SVG icon components |
| **Tweak date logic (e.g. "kal", "parso")** | `src/domain/dates.ts` | Indian timezone (Asia/Kolkata) date helpers |
| **Change how numbers are parsed** | `src/parser/numberWords.ts` | English and Hindi word-to-number maps |
| **Add a new column to SQLite** | `src/db/migrations.ts` | Add migration step incrementing `user_version` |
| **Change the backup JSON format** | `src/backup/validation.ts` | Backup schema definition and validator |
| **Edit the Settings screen** | `app/settings.tsx` | Categories, learned keywords, and backup UI |

---

## 💡 Quick Tips for Beginners

1. **Why is the database repository isolated?**
   Only `src/db/repository.ts` runs SQL queries. The rest of the app doesn't know or care whether
   data comes from SQLite, memory, or tests. This makes testing fast and bug hunting simple.
2. **Why pure functions for the parser?**
   Because `parseUtterance` doesn't touch the phone's microphone, screen, or database, we can run
   100+ tests on it in Jest in less than 2 seconds without launching an emulator!
3. **What is soft delete?**
   When you delete an item, Wini sets `deleted_at = current_timestamp` instead of deleting the row.
   That is how the **Undo** button works!

---

## 🎨 How to reskin the app: change tokens.ts, then these components

Wini v2 separates all visual design tokens and presentation components from screens and business logic.
To give Wini a brand-new look and feel (or switch between light/dark themes), follow this two-step process:

### Step 1: Change Design Tokens (`src/ui/tokens.ts`)
All primitive styling values live in `src/ui/tokens.ts`. Changing a value here ripples across the entire app instantly:
- **`colors`**:
  - Backgrounds: `background` (canvas), `surface` (cards), `surfaceAlt` (sub-cards), `surfaceInput` (inputs).
  - Brand & Accents: `primary` (royal blue), `accentPurple` (insights), `chartBlueStart`/`chartBlueEnd`.
  - Financial States: `income` (emerald green), `expense` (coral pink), `danger` (ruby red), `warning` (amber).
  - Neutrals: `text` (high-contrast text), `textSecondary`, `muted` (subtitles/placeholders), `border`.
- **`typography`**:
  - Font families: `displaySerif` (DM Serif Display for numbers & headers), `body` (Inter regular), `bodySemiBold`, `bodyBold`.
  - Font sizes & line heights: `sizeXs` (11px) up to `sizeHero` (40px).
- **`spacing`**:
  - Consistent 4px/8px grid: `none` (0), `xs` (4), `sm` (8), `md` (12), `lg` (16), `xl` (24), `xxl` (32), `xxxl` (48).
- **`radii`**:
  - Corner curves: `sm` (8), `md` (12), `lg` (16), `xl` (24), `round` (9999 for pills/buttons).
- **`elevations`**:
  - Cross-platform Android elevation and iOS shadow objects (`sm`, `md`, `lg`).
- **`motion`**:
  - Standard transition durations: `fast` (150ms), `normal` (250ms), `slow` (400ms).

> **Enforced Rule:** Screen files inside `app/` are forbidden from containing hard-coded hex colors (e.g. `#FFFFFF` or `#0A0F1E`). An automated unit test (`src/ui/__tests__/rawColorCheck.test.ts`) verifies this on every `npm test`. Always reference `colors.<token>`.

### Step 2: Customize Shared UI Kit Components (`src/ui/kit/`)
Wini's visual building blocks take only props and tokens—they contain zero business logic. When modifying layouts or borders, edit these components:

| Component | File | What it controls |
|---|---|---|
| `<Screen />` | `src/ui/kit/Screen.tsx` | SafeArea bounds, status bar theme, and optional ScrollView wrapper |
| `<Card />` | `src/ui/kit/Card.tsx` | Container variants (`surface`, `elevated`, `glass`, `outlined`) & paddings |
| `<Button />` | `src/ui/kit/Button.tsx` | Actions (`primary`, `secondary`, `ghost`, `danger`), sizes (`sm`, `md`, `lg`), loading spinner & disabled states |
| `<Chip />` | `src/ui/kit/Chip.tsx` | Category tags, filter pills, custom tint badges, and selected states |
| `<ListRow />` | `src/ui/kit/ListRow.tsx` | List items with left icons/emojis, title, subtitle, right value, and chevron |
| `<SectionHeader />` | `src/ui/kit/SectionHeader.tsx` | Screen section titles, optional subtitles, and action links ("See All", "Edit") |
| `<AmountText />` | `src/ui/kit/AmountText.tsx` | Indian numbering system (`₹1,50,000`), income (+)/expense (−) color styling, and typography sizes |
| `<BottomSheet />` | `src/ui/kit/BottomSheet.tsx` | Accessible slide-up modal with drag handle, title bar, and touch backdrop dismissal |
| `<EmptyState />` | `src/ui/kit/EmptyState.tsx` | Zero-state illustrations with title, description, and primary call-to-action |
| `<ErrorBanner />` | `src/ui/kit/ErrorBanner.tsx` | Actionable error alert with retry and dismiss handlers |
| `<Skeleton />` | `src/ui/kit/Skeleton.tsx` | Animated pulsing loading placeholders for data loading |
| `<SegmentedControl />` | `src/ui/kit/SegmentedControl.tsx` | Period switches (`Week \| Month \| Quarter \| Year`) and multi-tab toggles |
| `<IconButton />` | `src/ui/kit/IconButton.tsx` | 48px touch targets for navigation icons, mic triggers, and action bar buttons |

### Step 3: Verify in the Component Gallery
To inspect all components and states at once without navigating multiple screens:
1. Open Wini on your device or in development mode.
2. Go to **Settings** → scroll to the **Developer** section → tap **Component Gallery**.
3. View every component across all states: default, pressed, disabled, loading, empty, and error.

