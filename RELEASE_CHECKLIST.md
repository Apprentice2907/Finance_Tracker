# Wini Release & Physical Device Verification Checklist

This document details the exact manual steps and verification checklist to build, install, and test **Wini** on a physical Android device.

---

## 1. EAS Account & Build Commands (Run on your machine)

> [!NOTE]
> Never commit EAS credentials or auth tokens to git. Run these commands locally in your terminal.

### Step 1: Login to EAS
```bash
# Log in to your Expo account
npx eas login

# Verify your logged-in account
npx eas whoami
```

### Step 2: Configure Project & Credentials
```bash
# Link repository to your EAS project (first time only)
npx eas project:init
```

### Step 3: Build Installable Android APK (Preview Profile)
```bash
# Generates a standalone Android APK that you can directly install on your phone
npx eas build --profile preview --platform android
```
- When the build finishes, EAS provides a direct download link (and QR code) for the `.apk` file.
- Download the `.apk` on your Android phone and install it (allow "Install unknown apps" if prompted).

### Step 4: Build Development Client (Optional, for debugging native modules)
```bash
# Builds a development client APK with expo-dev-client included
npx eas build --profile development --platform android
```
- To run locally against the dev client:
  ```bash
  npx expo start --dev-client
  ```

---

## 2. Physical Phone Verification Test Checklist

Run through these verification items on your physical Android handset:

### A. Manual Transaction Management
- [ ] **Add Expense**: Tap "Manual Add" on Home. Enter amount `120`, pick category `Food 🍔`, add note "Lunch", select date. Tap "Save". Verify balance increases on Home.
- [ ] **Add Income**: Tap "Income" quick action. Enter `50000`, select `Income 💰`, note "Salary". Verify income card updates.
- [ ] **Edit Entry**: Tap an entry in "Recent Entries" or on "History". Change amount or note. Verify updates immediately reflect.
- [ ] **Delete & Undo**: Swipe or tap trash on an entry. Verify haptic feedback, entry disappears, and "Entry deleted - UNDO" snackbar appears. Tap "UNDO" and confirm entry returns.

### B. Voice Input Flow (Section 8)
- [ ] **Permission Prompt**: On fresh install, tap big mic button. Verify Android mic permission dialog appears with explanation.
- [ ] **Voice Expense**: Say `"add rickshaw 10 rupees"`. Verify pulsating microphone ring, live partial transcript, and transition to Confirm Sheet.
- [ ] **Confirmation Sheet**: Verify Amount is `₹10`, Category is `Transport 🛺`, Note is `Rickshaw`, Date is `Today`. Tap "Save". Verify haptic feedback and banner `"Added ₹10 for Transport."`.
- [ ] **Hinglish Voice**: Say `"kal 100 petrol"`. Confirm date parses as yesterday and category as Transport.
- [ ] **Low Confidence Routing**: Speak an ambiguous phrase or noise (e.g. `"something weird"`). Confirm it routes pre-filled to the manual edit modal instead of breaking.

### C. Type Instead Flow
- [ ] Tap "Type Add" from the quick action row.
- [ ] Type `"2k shoes"`. Tap "Confirm & Parse".
- [ ] Verify Confirm Sheet shows `₹2,000` for `Shopping 🛍️`.

### D. Learned Keywords (Section 6 & 8)
- [ ] Say or type `"idli 50"`. The word "idli" is not in the default dictionary.
- [ ] In the Confirm Sheet, category will be null/unassigned. Tap the category chip and select `Food 🍔`. Tap Save.
- [ ] Now go to **Settings** -> verify `"idli"` appears under **Learned Keywords** mapped to `Food 🍔`.
- [ ] Go back to Home and say or type `"idli 60"`. Confirm Wini now automatically assigns `Food 🍔`!
- [ ] Go to Settings and tap trash on `"idli"`. Confirm it is deleted from learned keywords.

### E. Offline Use (Air-Plane Mode)
- [ ] Turn on Airplane mode (disable Wi-Fi and mobile data).
- [ ] Add a transaction manually. Verify SQLite saves and persists offline.
- [ ] Add a transaction by voice (if Android offline speech recognition pack `en-IN` is installed on the phone). If offline pack is absent, verify friendly message explains network/offline model requirement without crashing.
- [ ] Restart the app completely while offline. Verify all data persists intact.

### F. Backup & Restore (Section 10)
- [ ] Navigate to **Settings** -> **Backup & Restore**.
- [ ] Tap **Export Backup**. Verify system share/save dialog opens with file `wini-backup-YYYY-MM-DD.json`. Save or share the file.
- [ ] Verify `Last Backup` date in Settings updates to today.
- [ ] Tap **Import Backup**. Pick the saved JSON file. Verify preview counts (Transactions, Categories, Keywords) match.
- [ ] Test **Merge**: Verify no duplicate records created.
- [ ] Test **Replace**: Confirm warning alert appears, tap "Yes, Replace", verify data replaces cleanly.

### G. UI, Gestures & Hardware Back Button
- [ ] **Android Back Button**: Open `VoiceSheet`. Press hardware back button. Confirm sheet closes without exiting app.
- [ ] **Hardware Back Button with Edit Modal**: Open Transaction Modal. Press back button. Confirm modal closes.
- [ ] **Stacked Wallet Cards**: Tap the peek cards ("Spent today" and "Income this month"). Verify smooth spring animation bringing the card forward.
- [ ] **Privacy Eye**: Tap the eye button in the top right. Confirm all card balances toggle between `••••••` and numerical values.
- [ ] **Keyboard Behavior**: Open manual add modal, tap amount or note input. Verify keyboard adjusts smoothly without clipping buttons or inputs.
- [ ] **Screen Dimensions**: Verify layout on 360px - 412px widths with zero horizontal overflow.
