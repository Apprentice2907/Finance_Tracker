# WINI — Design Decisions (running log)

The owner explains the design step by step. Each step below is **locked** once written. This file **overrides** `WINI_DESIGN_SPEC.md` and `WINI_V2_FEATURES.md` wherever they conflict. New steps are appended at the bottom. Items under **OPEN** are not decided yet: do not guess them, keep the current behaviour and leave a clean seam.

Rules that always apply: no `eas` commands; no new native packages (use `react-native-svg`, `@expo/vector-icons`, Reanimated, `expo-font`, already installed); run `npm run prebuild-check`; add tests; commit, tag, push; never force push; never weaken existing tests.

---

## STEP 1 — Dark theme "Cosmos + Black", charts, icons, Home hero

Reference images supplied by the owner: (a) an "Analytics" screen with a thick-bar chart, (b) an "Expenses" screen with a donut chart and "Recent expenses" list, (c) a top card with an iridescent gradient. Match them closely. Measurements below were read by eye from the screenshots; treat them as starting values, compare on the phone, and adjust in `tokens.ts` only.

### 1.1 Palette (Dark / "Night" theme)

| Token | Value | Use |
|---|---|---|
| `bg` | `#000000` | App background: true black |
| `surface` | `#161618` | Cards |
| `surface2` | `#1F1F22` | Tiles, inputs, inactive toggle track |
| `chartTrack` | `#38383C` | Unselected bars |
| `hairline` | `rgba(255,255,255,0.08)` | Borders |
| `text` / `textMuted` | `#FFFFFF` / `#8E8E93` | Text |
| `accent` | `#F2F96E` | Lime: "View all", centre nav button, primary actions. Text on it is near-black |
| `glassFill` / `glassBorder` | `rgba(255,255,255,0.10)` / `rgba(255,255,255,0.18)` | Glass chips and icon holders |
| Hero texture | `assets/textures/cosmos-silk.jpg` | Top hero card (see 1.5). `cosmos-silk-dark.jpg` for small cards. |

The earlier galaxy textures stay available for account cards. Remove emojis everywhere (see 1.4).

### 1.2 Bar chart (copy of reference "Analytics")

**Toggle (top):** full-width segmented pill `Expenses | Income`. Track `surface2`, height 48, radius 999, 4 px inner padding. Active segment: solid **white** pill with **black** semibold text; inactive text near-white. Slide animation 200 ms.

**Chart card:** `surface`, radius 28, padding 20.
- Top row: big amount at left (36–40 px, regular weight, white); at right a period pill dropdown ("Week ⌄", fill `surface2`, radius 999, height 36).
- **Bars:** equal-width, **thick** and almost touching: each bar is about 80% of its slot, gap about 20% (in the reference: roughly 28 px bars with 7 px gaps on a 260 px chart). **Corner radius about 9 px on both top and bottom** (soft rounded rectangle, not pill, not sharp). Chart plot height about 190 px; the tallest bar reaches about 90% of it; a bar with zero value still shows a faint 6 px stub.
- Unselected bars: `chartTrack`. **Selected bar:** vertical gradient taken from the cosmos palette: top `#DCE4FF` → middle `#7E96FF` → bottom `#5B5BF0`.
- **Tooltip:** a white rounded rectangle (radius 10, padding 6×10, black semibold 13 px text, no arrow) centred 8 px above the selected bar, showing that bar's amount. It must stay inside the card (clamp at the edges).
- Day labels under the bars, 12 px, `textMuted`; the selected label turns white.
- Tap a bar to select (haptic tick); default selection is the current period's latest bar. Bars grow from the baseline on first appear (400 ms).

### 1.3 Donut chart (copy of reference "Expenses")

- Header row: "Expenses" title at left, **month pill** at right ("October ⌄", dark glass pill with hairline border).
- **Ring:** thick stroke, about 20% of the diameter, **rounded caps**, with a visible **gap of about 6°** between segments. Segments are ordered clockwise starting at 12 o'clock, largest first.
- Segment palette (cycle in this order, then reuse): mint `#7DF2A3`, cyan `#7FE3F5`, white `#F2F2F2`, periwinkle `#6B6BF0`, lime `#F2F96E`, pink `#F58FD6`, orange `#FFB27A`, lavender `#B69CFF`, grey `#9AA0A6`. A category keeps the same colour everywhere (donut, legend, tiles).
- **Centre:** "Total expenses" (13 px, `textMuted`) above the amount (32 px, bold, white). Label changes to "Total income" when the toggle is on Income.
- **Legend** under the ring: wraps to 3 columns; each item = 10 px dot + name (13 px). 
- Sweep-in animation clockwise, 500 ms.
- "Recent expenses" header with **"View all"** in lime at the right, then the list.

### 1.4 Category icons: vector, single colour, no emojis

- Use **line icons** from `@expo/vector-icons` (Ionicons outline set) as **white single-colour glyphs** inside a **glass circle holder** (44 px, fill `glassFill`, 1 px `glassBorder`). An alternate **block** holder (solid `surface2` rounded square, radius 14) is allowed in tiles.
- Mapping (verify each name exists in the installed icon set; pick the closest otherwise): Food `restaurant-outline`; Transport `car-outline`; Shopping `bag-handle-outline`; Bills `receipt-outline`; Health `heart-outline`; Fun `game-controller-outline`; Education `school-outline`; Entertainment `film-outline`; Subscriptions `repeat-outline`; Groceries `cart-outline`; Rent `home-outline`; Other `ellipsis-horizontal`; Income `trending-up-outline`; Salary `briefcase-outline`.
- Data change: add `categories.icon` (string key from an `ICON_KEYS` list in `src/domain`). Write a migration that fills it from the existing `emoji` value (and a safe default for unknown emojis), keep the old `emoji` column untouched for compatibility, and stop reading it in the UI. The category editor (later) lets the user pick an icon from a grid of these keys.
- **No emojis anywhere in the UI:** remove them from screen titles and section headers too (for example "Wini Wallet 🛺", "Settings ⚙️", "Insights 📊", "Appearance & Theme 🎨", "Night 🌙", "Pocket ☀️", "Voice Lab 🔬"). Add a test that scans `app/` and `src/ui/` for emoji characters in source strings and fails if any are found. Parser keyword lists and user data are exempt.
- Transaction rows, tiles, the Categories list, the confirm sheet and the Voice Check screen must all use the new `CategoryIcon` component.

### 1.5 Home hero (top card, copy of the reference gradient card)

A `TexturedCard` with `cosmos-silk.jpg`, radius 28, about 210 px tall, with a soft dark scrim over the bottom 40% so text stays readable. Contents:
- **Top-left:** white pill selector with dark text and a chevron: the **month** ("October 2026 ⌄"); tapping opens a month picker sheet (previous months only up to the current one).
- **Top-right:** glass circle with an **eye** icon: hide/show all amounts on Home (hidden state shows `••••••`).
- **Middle:** label "Net cashflow" (14 px, 80% white) and the amount for the selected month = income − expense, big (44–52 px, white, regular weight, dimmed decimals).
- **Bottom row:** two glass chips side by side, each with a small label and an amount: **Income** (up-right arrow icon) and **Expense** (down-right arrow icon), amounts 18 px semibold.
- No emojis, no extra buttons on the card.

### 1.6 Home structure (what stays, what goes)

Order, top to bottom:
1. Hero card (1.5).
2. **Cashflow card**: the bar chart from 1.2 with the `Expenses | Income` toggle, showing the selected month. Buckets: one thick bar per **week of the month** (W1 to W5); period dropdown offers "Month" (default) and "Week" (Mon to Sun of the current week).
3. **Category breakdown card**: the donut and legend from 1.3, driven by the same `Expenses | Income` toggle (one shared toggle for sections 2 and 3).
4. **Recent 5** list with "View all", rows built as in 1.3/1.4.
5. Floating bottom navigation with the lime centre mic button. 

**Removed from Home:** the whole quick-action row (**Voice Add, Type Add, Income, Insights** buttons). Replacement paths: the centre mic button opens the voice sheet; **Type instead** stays inside that sheet; the add / confirm sheet gets an `Expense | Income` toggle for adding income; Insights is reached from the Reports tab (rename "Insights" to "Reports" when that screen is built). Remove the big floating mic that duplicates the nav button, so there is exactly one mic control.

### 1.7 Assumptions made (owner: correct me if wrong)
- A1. The whole quick-action row is removed, including the "Income" button.
- A2. On Home the bar chart uses weekly buckets for the selected month, because 30 thick bars would not fit; Reports will show daily bars for shorter periods.
- A3. The 2-column category **tiles grid** from the Analytics reference goes on the **Reports** screen, not Home.
- A4. Background is pure black; cards are dark grey.

### OPEN (do not decide)
- O1. Final bottom-navigation layout (which tabs sit left and right of the centre mic).
- O2. Light theme ("Pocket") details: to be explained in a later step.
- O3. Accounts, Reports, Categories and Vault layouts: to be explained in later steps.

### 1.8 Implementation checklist for Step 1
1. Tokens: update dark palette (1.1); add the chart palette and gradient colours as tokens.
2. Components in `src/ui/kit/`: `SegmentedControl` (white active pill), restyled `BarChart` (1.2), restyled `DonutChart` (1.3), `CategoryIcon` (1.4), `PillSelector`, `GlassChip`, `HeroCard` (1.5), `CategoryTile`.
3. Database: migration adding `categories.icon` with backfill; repository returns `icon`; tests for the migration and the mapping (every default category has an icon; unknown emoji gets the default).
4. Home screen restructured per 1.6, using tested pure functions for week buckets of a month, the toggle-driven totals, and the legend/segment data.
5. Remove emojis from UI strings; add the emoji-scan test.
6. Component Gallery: add every new component in all states.
7. Tests: bar geometry (slot width, gap ratio about 0.2, radius, tooltip clamping), donut geometry (segment angles with 6° gaps, sums to 360°, rounded-cap offset), week bucketing across month boundaries and leap year, hero amounts with zero data, hidden-amount mode, icon mapping coverage, emoji scan, "no quick-action row on Home".
8. Docs: update README, `docs/HOW_IT_WORKS.md`, `CHANGELOG.md`.
