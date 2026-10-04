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
1. app/index.tsx                    → Floating mic button opens VoiceSheet
       ↓
2. src/ui/VoiceSheet.tsx            → Plays pulse animation, calls SpeechService
       ↓
3. src/speech/ExpoSpeechService.ts  → Speaks to Android's speech recognizer (en-IN)
       ↓ (Audio → "add 10 rupees rickshaw")
4. src/parser/parseUtterance.ts     → Pure brain extracts { amount, category, date, note }
       ↓
5. src/ui/ConfirmSheet.tsx          → Shows parsed card: ₹10, Transport, Today
       ↓ (User taps "Save")
6. src/state/useAppStore.ts         → Zustand store action adds transaction
       ↓
7. src/db/repository.ts             → Writes row into local phone SQLite
       ↓
[Screen Updates & Haptic Buzz!]
```

---

### Step-by-Step Code Walkthrough

### 1. The Trigger (`app/index.tsx`)
When you tap the big floating mic button at the bottom of the Home screen:
- State `isVoiceSheetVisible` is set to `true`.
- The `<VoiceSheet />` modal slides up from the bottom.

### 2. Recording & Speech Recognition (`src/ui/VoiceSheet.tsx` & `src/speech/ExpoSpeechService.ts`)
- `VoiceSheet` asks `ExpoSpeechService.startListening()` to begin listening.
- It tells Android: *"Please use on-device recognition if possible (`requiresOnDevice: true`), using Indian English (`en-IN`)"*.
- As you speak, Android streams partial text back (shown live on the screen).
- When you stop speaking, Android sends the final transcript: `"add 10 rupees rickshaw"`.

### 3. The Brain: Natural Language Parsing (`src/parser/parseUtterance.ts`)
This is a **pure function**—meaning it takes a string in, and returns an object out, with zero
phone dependencies or network calls!
- **Amount extraction**: Looks for numbers, multipliers (`k`, `lakh`), and words (`das`, `ten`).
  It scores candidates to make sure `"2"` in `"2 chai 20 rupees"` is treated as a quantity, not
  the price.
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

### 4. User Verification (`src/ui/ConfirmSheet.tsx`)
Wini never silently saves an entry without letting you see it first.
- The confirm bottom sheet shows: **₹10**, **Transport**, **Today**, Note: **Rickshaw**.
- If the confidence was low (e.g. muddled audio), it opens the full edit form instead.
- You tap **Save**! (A quick haptic tap buzzes on your phone).
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
