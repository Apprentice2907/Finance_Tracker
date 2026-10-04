# Wini 🛺

Wini is a voice-first personal expense tracker for Android (Expo React Native + TypeScript).
Built for speed, simplicity, and offline-first local SQLite persistence.

## Key Features
- **Voice-first & Typed logging**: Speak or type naturally in English or Hinglish (e.g. *"add 10 rupees rickshaw"*, *"das rupaye chai"*, *"kal 100 petrol"*).
- **Rule-based sentence parser**: Instant offline extraction of amount, category, note, and date without external AI/cloud latency.
- **Local-first SQLite storage**: All data stays private on the device with soft deletes and zero cloud dependencies.
- **Learned keywords**: Personal vocabulary adapts over time when categories are manually adjusted.
- **Wallet-style dark navy UI**: Clean financial dashboard with stacked cards, daily grouping, insights charts, and haptic feedback.
- **Single-file JSON backup**: Export and import data at any time with duplicate-safe merge or replace.

## Tech Stack
- Expo (SDK 57) + React Native + TypeScript (strict)
- Navigation: `expo-router`
- Database: `expo-sqlite`
- State: `zustand`
- Speech: `expo-speech-recognition` behind `SpeechService` interface
- Charts: Custom SVG with `react-native-svg`
- Testing: Jest

## Getting Started

### Prerequisites
- Node.js >= 22
- Android device or Android Studio emulator
- Expo Go or Expo Development Build

### Installation
```bash
npm install
```

### Running Locally
```bash
npm start
# or for android
npm run android
```

### Running Tests
```bash
npm test
```
