# 🛺 Wini — say it, and it's saved

> **"Add 10 rupees rickshaw."**  →  `₹10 · Transport · today` ✅

Wini is a **voice-first personal expense tracker** for Android. You tap the mic, talk like a normal human, and Wini figures out the **amount**, the **category** and the **date**. It all lives on your phone. No account, no server, no passwords.

It's also my **first ever Android app**, so this repo doubles as a learning journal. 🎒 If you're a beginner too, the glossary and "lessons learned" sections below are for you.

---

## ✨ What Wini can do (v1)

- 🎙️ **Talk to add**: tap the mic, say "add rickshaw 10 rupees" or "kal 100 petrol"
- 🤖 **Two Voice Engines**:
  - **Phone Recognizer**: instant, lightweight, uses Android's native speech system with contextual hints
  - **On-Device Whisper**: 100% private, runs OpenAI Whisper locally offline using quantized models (`tiny`, `base`, `small`)
- 🔬 **Voice Lab**: developer workbench under Settings to benchmark recognition latency, inspect alternatives & confidence, and log ground truth pairs
- 🩹 **Smart Mishearing Recovery**: handles phonetic spelling ("chay", "ricksha"), number homophones ("for chai" -> 4 chai), and conservative fuzzy matching
- ⌨️ **Type to add**: same brain, no microphone needed
- ✋ **Manual add / edit / delete**, with **Undo** after deleting
- 🧠 **Learns your words**: pick a category once for a new word and Wini remembers it
- 💳 **Wallet-style home**: stacked cards for this month, today and income
- 📊 **Insights**: weekly/monthly bars, top categories, daily average
- 🗂️ **History**: grouped by day, searchable, filterable
- 💾 **Backup**: export everything to one JSON file, import it back (merge or replace)
- 🔌 **Works offline**: your data never leaves your phone

## 🗣️ Try saying...

| You say | Wini understands |
|---|---|
| add 10 rupees rickshaw | ₹10 · Transport · today |
| add rickshaw 10 rupees | ₹10 · Transport · today |
| spent 250 on lunch yesterday | ₹250 · Food · yesterday |
| das rupaye chai | ₹10 · Food · today |
| kal 100 petrol | ₹100 · Transport · yesterday |
| parso 50 metro | ₹50 · Transport · 2 days ago |
| got 5000 salary | ₹5,000 · Income · today |
| 2k shoes | ₹2,000 · Shopping · today |
| 2 chai 20 rupees | ₹20 · Food (the "2" is a quantity, not the price!) |
| fifty rupees metor | ₹50 · Transport · today (fuzzy recovers "metro"!) |

If Wini isn't sure, it doesn't guess in silence. It opens a pre-filled form so you can fix it in one tap. 🙌

---

## 🎬 How it works

```
 🎙️ you speak
     ↓
 📝 Speech Engine      (Phone recognizer OR On-device local Whisper)
     ↓
 🔍 Multi-Alternative  (parses top candidate transcripts, picks highest confidence)
     ↓
 🧠 parseUtterance()   (pure function: mishearing normalization + {amount, category, date, note})
     ↓
 🔬 Voice Log / Sheet  (logs ground truth text if edited, confirms before save)
     ↓
 💾 SQLite on the phone (money stored as whole paise, never decimals)
```

The parser is **plain TypeScript with no phone stuff inside**, so it can be tested on a laptop in milliseconds. That's the secret to trusting it. 🧪

---

## 🧰 Tech stack (and why)

| Tool | What it does | Why I picked it |
|---|---|---|
| **Expo + React Native** | Build Android apps with TypeScript | One codebase, great tooling for a first app |
| **expo-router** | Screens and navigation | Folders become screens |
| **expo-sqlite** | Database on the phone | Offline, fast, no server |
| **zustand** | Small state store | Less boilerplate than the alternatives |
| **expo-speech-recognition** | Phone Recognizer | Uses phone's built-in recognizer (biased with contextual hints) |
| **whisper.rn + expo-speech-recognition** | On-Device Whisper | 100% offline local speech recognition with quantized ggml models |
| **react-native-svg** | Charts | Hand-drawn SVG charts, no heavy library |
| **Jest** | Tests | 203 automated tests (parser, database, backup, voice, whisper) |
| **EAS Build** | Builds the APK in the cloud | No Android Studio needed on my laptop |

## 📁 Folder map

```
app/            🖼️  screens (Home, History, Insights, Settings) — kept thin on purpose
src/
  db/           💾  schema, migrations, Repository (the ONLY file family that touches SQLite)
  domain/       📐  money, dates, types, default categories
  parser/       🧠  parseUtterance(), number words (English + Hindi), keyword map
  speech/       🎙️  SpeechService interface + the real and fake implementations
  backup/       📦  export/import + validation
  state/        🧺  zustand store built on the Repository
  ui/           🎨  design tokens, sheets, icons, error boundary
```

---

## 🚀 Run it yourself

**You need:** Node 20+, an Android phone, and a free [Expo](https://expo.dev) account.

```powershell
npm install              # grab all the packages
npm test                 # run the tests (the fast way to feel safe)
npm run typecheck        # TypeScript says "all good"?
npm run lint             # tidy code check
```

> ⚠️ **Voice does not work in Expo Go.** The speech module is native code, so you need a *development build* (see below).

### Build the app (cloud build, free tier)

```powershell
npx eas login
npx eas build --profile development --platform android   # dev app with the debug menu
npx eas build --profile preview --platform android       # normal installable APK
```

Wait for the build (a few minutes to a while, depending on the queue). When it finishes, the terminal prints a **link and a QR code**. Say **no** if it asks about an emulator.

### Install on your phone 📲

1. Open the link or scan the QR code **on your phone**
2. Download the `.apk`
3. Android asks to allow installs from this source, so allow it
4. Open **Wini**, allow the microphone, and say *"add 10 rupees chai"*

### Run with live reload (development build only)

```powershell
npx expo start --dev-client
```

Open the Wini dev app on your phone and it connects to your laptop. Save a file, see the change. ⚡

---

## 🧠 Android words for beginners

| Word | Plain English |
|---|---|
| **APK** | The installable file for an Android app (like an `.exe` on Windows) |
| **Expo Go** | A ready-made app that runs simple Expo projects instantly. It can't include custom native code |
| **Development build** | *Your own* version of Expo Go that includes the native modules you installed (like the microphone one) |
| **Native module** | Code written in Kotlin/Java that talks to phone hardware (mic, haptics) |
| **EAS** | Expo's cloud build service. It compiles the Android app so my laptop doesn't have to |
| **Keystore** | The "signature key" that proves an app update came from me. EAS stores mine safely 🔐 |
| **Application id** | The app's permanent name on Android (`com.prince007p.wini`). Change it *before* publishing, never after |
| **Permission** | Something Android asks you to allow (microphone) |
| **SQLite** | A tiny database that lives in a single file inside the app |
| **Soft delete** | Marking a row as deleted instead of erasing it, so **Undo** works |
| **Paise** | ₹1 = 100 paise. Wini stores money as whole numbers of paise so `0.1 + 0.2` can never cause a rounding bug 🐛 |

---

## 🛟 Git save points (my safety net)

Early on, I learned the hard way that a coding agent can delete a lot very fast. Git tags saved me. 😅

| Save point | What it is |
|---|---|
| `flet-final` (tag) | The **old Python/Flet version** of this project, kept forever |
| `legacy-flet` (branch) | Same old version, as a branch |
| `phase-3-voice` | Voice + confirm flow added |
| `phase-4-ui` | Wallet look, charts, animations |
| `phase-5-release` | Backup/restore, builds, checklist |

```powershell
git tag                                   # list save points
git checkout phase-4-ui                   # time-travel (look around, don't edit here)
git switch main                           # come back to the present
git worktree add ..\Finance_Tracker_flet flet-final   # open the old Flet app in its own folder
```

---

## 🔒 Privacy, honestly

- All your expenses stay **on the phone** in SQLite. There's no server and no account.
- Backups are files **you** export and store wherever you like.
- Speech recognition prefers **on-device** mode. If the offline English (India) pack isn't installed, Android may fall back to its online recognizer, which means audio can go to Google's servers. Install the offline language pack in your phone's speech settings if you want it fully offline.

## 🐛 If something breaks

| Problem | Try this |
|---|---|
| Mic button does nothing | Allow microphone permission in Android settings → Apps → Wini |
| Voice works in the dev build but not Expo Go | Expected. Expo Go can't load the speech module |
| `eas build` asks questions in CI | Add `--non-interactive`, or run it on your own laptop |
| Wini heard the wrong thing | Use the **Edit** button on the confirm card. It learns |
| Tests fail after a change | `npm test` tells you exactly which sentence broke |
| I deleted something important | `git tag` and `git log`, then see **Git save points** above |

---

## 🧪 Tests

At the last count there were **130 tests** across the parser, the database, backup/restore, and the confirm flow. The parser has to handle English, Hinglish, number words (*"das"*, *"pachas"*), `k`/`lakh`, quantity-vs-price confusion, and garbage input without crashing.

Things that **can only be tested on a real phone**: the microphone, on-device recognition, haptics, the Android back button, the share sheet, and how screens look on real 360–412 px displays. See `RELEASE_CHECKLIST.md`.

---

## 🗺️ Roadmap

- [x] **v1**: personal, offline, voice + typing, backup file
- [ ] **v1.5**: offline Whisper speech model, a small local AI for messy sentences, "Hey Wini" wake word, a local-only encrypted vault for cards and bank details
- [ ] **v2**: accounts and cloud sync so friends can use it (Supabase or PocketBase), shared releases

## 📓 Lessons learned (so far)

1. **Make a save point before every big change.** Tags are free.
2. **Test the brain first.** The parser was done and tested before a single microphone line existed.
3. **Money is integers.** Always.
4. **A UI that has never run on a real phone is a guess.** Type-checking isn't the same as looking at it.
5. **Native code needs a development build.** Expo Go is a demo, not the real thing.
6. **Keep screens thin.** Logic in `src/`, screens in `app/`, and everything gets easier to test.
7. **Ask "what could this delete?" before you run an agent with file access.**

---

## 📜 History

Wini started life as a **Python + Flet** desktop/mobile finance tracker. It worked, but the UI wasn't where I wanted it to be, so I rebuilt it in **React Native** with voice at the center. The old version lives on at the `flet-final` tag. 🕰️

Made with curiosity (and a lot of red error screens) by **Prince**. 🚀