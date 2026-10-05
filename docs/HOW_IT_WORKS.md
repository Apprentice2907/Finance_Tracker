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
