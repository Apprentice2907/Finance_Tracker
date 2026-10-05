# WINI — Design Spec (two themes: **Night** and **Pocket**)

This file defines how Wini looks. It extends `WINI_V2_FEATURES.md` (what the app does). Features come first; this spec is applied through the **UI kit** (`src/ui/tokens.ts` and `src/ui/kit/*`), so a screen never hard-codes a colour, size, or font.

The references (three dark fintech concept sets and one light "pocket wallet" set with an animated intro) are **inspiration for layout, mood, and colour only**. Draw original shapes and icons. Do not copy their artwork, names, brand logos, or the app-icon design. Do not ship third-party brand logos (Netflix, Uber, and so on); use category icons or letter avatars.

---

## 1. Design principles

1. **Calm and minimal.** Few elements per screen, large numbers, generous space.
2. **Numbers are the hero.** Amounts are the biggest, clearest thing on every card.
3. **One accent per theme**, plus a small set of category colours.
4. **Texture, not clutter.** Galaxy gradients with fine grain appear only on hero cards and the confirm sheet.
5. **Fast.** Gradients are pre-rendered image assets, charts are SVG, no live blur, animations under 250–400 ms.
6. **Readable.** Text contrast of at least 4.5:1. Text on the bright lime accent is always near-black.
7. **Phone-only**, portrait, 360–412 px, thumb-friendly (48 px targets, primary actions in the bottom half).

---

## 2. What we take from each reference

| Reference | Take this |
|---|---|
| **Dark set A** (colourful donut, squircle category icons) | Near-black background; donut chart with rounded segments and gaps; coloured squircle category icons with a dark glyph; floating pill nav with a centre "+" button; "Recent expenses" rows with a small subtitle |
| **Dark set B** (lime accent, glass buttons, keypad) | Lime/yellow accent for the main action; dark glass buttons with a hairline border; pastel donut colours; big keypad for amount entry; circular dark icon holders; a gradient hero card with grain |
| **Dark set C** (analytics) | Segmented control `Expenses | Income`; weekly bar chart with one highlighted gradient bar and a floating value tooltip; a grid of category total tiles; confirm sheet with a gradient hero showing the big amount |
| **Light "Pocket" set + video** | Light grey app background with white rounded cards; stacked coloured account cards peeking out of a "pocket" on the main card (dashed stitch line); serif numerals; thin line chart with a dashed projection; semicircle spending gauge; floating pill nav with a highlighted active tab; frosted glass buttons on the blue card |

---

## 3. Themes and tokens

Implement a `ThemeProvider` with `useTheme()` and three user choices in Settings: **System**, **Night** (dark), **Pocket** (light). Default: System. All colours below are **approximate starting values taken by eye from the references**; adjust until the screens feel like the references, then freeze them in `tokens.ts`.

### 3.1 Night (dark)

```ts
night = {
  bg:          '#0B0B0D',   // app background, near black
  surface:     '#151517',   // cards
  surface2:    '#1E1E21',   // tiles, inputs, keys
  border:      'rgba(255,255,255,0.08)',
  text:        '#FFFFFF',
  textMuted:   '#8E8E93',
  accent:      '#F2F96E',   // lime-yellow: primary button, active tab dot, key highlights
  onAccent:    '#0B0B0D',   // text on accent
  income:      '#7CF2A0',
  expense:     '#FF6B7A',
  danger:      '#FF5A5F',
  chartTrack:  '#2A2A2E',   // unselected bars
  glassFill:   'rgba(255,255,255,0.06)',
  glassBorder: 'rgba(255,255,255,0.12)',
  navFill:     'rgba(30,30,33,0.92)',
}
```

### 3.2 Pocket (light)

```ts
pocket = {
  bg:          '#F3F4F7',
  surface:     '#FFFFFF',
  surface2:    '#F6F7FA',
  border:      'rgba(10,15,30,0.06)',
  text:        '#14161B',
  textMuted:   '#7A8494',
  accent:      '#2B5BE8',   // blue main card / primary
  onAccent:    '#FFFFFF',
  income:      '#12B76A',
  expense:     '#E5484D',
  danger:      '#E5484D',
  chartLine:   '#3B6CF5',
  cardGreen:   '#19F07C',   // account card colours (peeking cards)
  cardYellow:  '#FFD60F',
  cardBlack:   '#04050A',
  glassFill:   'rgba(255,255,255,0.14)',
  glassBorder: 'rgba(255,255,255,0.28)',
  navFill:     'rgba(255,255,255,0.96)',
  paper:       '#FBF7EE',   // passbook paper
  paperLine:   '#E9E1CF',
}
```

### 3.3 Category colours (shared, tuned per theme)

Twelve distinct, friendly colours: yellow `#FFC83D`, mint `#2EE6A6`, violet `#7A5CFA`, magenta `#E5338A`, blue `#2F6BFF`, cyan `#35D0F2`, orange `#FF8A3D`, lime `#B8E04A`, pink `#FF8FD0`, coral `#FF6B6B`, teal `#1FB6A6`, grey `#8E8E93`. Default mapping (editable by the user):

| Category | Colour | Icon (Ionicons name; verify it exists in the installed set) |
|---|---|---|
| Food | yellow | `restaurant` |
| Transport | violet | `car` |
| Shopping | magenta | `bag-handle` |
| Bills | blue | `receipt` |
| Health | mint | `heart` |
| Fun | orange | `game-controller` |
| Education | cyan | `school` |
| Other | grey | `ellipsis-horizontal` |
| Income | lime | `trending-up` |
| Salary | teal | `briefcase` |

Category icon = **squircle** (radius 14 on a 40–44 px square) filled with the category colour and a near-black glyph (Night, like Dark set A), or a tinted 12% background with a coloured glyph (Pocket). Use `@expo/vector-icons` (already installed, no new native package). Users can pick any category icon and colour from a grid when they add or edit a category.

### 3.4 Typography

- **Sans (both themes):** Inter (already installed). Use tabular numbers for amounts when available.
- **Pocket numerals:** a refined serif for balances and big amounts. Prefer `Newsreader` (`@expo-google-fonts/newsreader`); `DM Serif Display` is already installed and is an acceptable fallback if Newsreader is unavailable. Check both load through `expo-font` with a system fallback and hold the splash screen until fonts are ready.
- **Night numerals:** large light-weight sans (Inter 300 to 400) at 40 to 56 px for hero amounts, with a smaller, muted decimal part (`₹14,500` with `.00` dimmed, as in the transfer screen).
- Scale: caption 12, body 14, label 15 (semi-bold), title 20, heading 28, hero 44 to 56.

### 3.5 Shape, spacing, depth

- Radii: card 24, tile 20, input 16, button 16 (primary pill 999), squircle icon 14, chip 999.
- Spacing scale: 4, 8, 12, 16, 20, 24, 32. Screen padding 20.
- Night: no shadows; depth from surface steps and hairline borders. Pocket: soft shadow `0 6 24 rgba(20,30,60,0.06)`.
- "Glass": semi-transparent fill plus a 1 px border. Do **not** use live blur (it is slow and may need a native module).

---

## 4. Textures: galaxy gradients with grain

Pre-rendered assets are supplied in `assets/textures/` (from the design-assets zip):
`aurora.jpg` (cyan, mint, lilac, lime), `nebula.jpg` (indigo, periwinkle, peach), `cosmos.jpg` (cyan to blue to violet), `ember.jpg` (magenta, orange, yellow, purple), `midnight.jpg` (deep blue, for dark cards), and `noise-tile.png` (a tileable grain overlay).

Usage:
- A **TexturedCard** component draws the chosen texture as a cover image behind the content, with a clipped rounded rectangle and optional `noise-tile.png` on top at 6–10% opacity (`resizeMode="repeat"` where supported, otherwise skip the overlay since the textures already contain grain).
- Each account card and the Home hero can use a texture; the user picks one when creating an account (so the Accounts screen looks like a stack of different "passbooks"). Store the texture key in the account record.
- Keep text on textures readable: add a subtle dark scrim (black at 10–25%) behind small text when needed, and check contrast.
- Never animate the textures (static images keep scrolling smooth).

---

## 5. Components (all in `src/ui/kit/`, theme-driven, no business logic)

1. **Screen**, **Card**, **TexturedCard**, **SectionHeader** (title + "View all"), **EmptyState**, **ErrorBanner**, **Skeleton**.
2. **Button**: primary (accent fill), secondary (glass), ghost, danger; sizes md/lg; loading state.
3. **GlassButton** tile: icon above a label (Speak, Type, Income, More), used in a row of four.
4. **SegmentedControl**: pill track, active segment filled (white on Night, white with shadow on Pocket). Used for `Speak | Type`, `Expense | Income`, and period choices.
5. **AmountText**: Indian grouping, dimmed decimals, sign colouring, serif in Pocket, with an optional count-up animation (400 ms).
6. **CategoryIcon** (squircle) and **CategoryTile** (icon, name, total; used in a 2-column grid like Dark set C).
7. **TransactionRow**: icon, title (note or category), subtitle (category and account), amount on the right, time or date under it.
8. **FloatingNav**: floating pill with 5 tabs (Home, Accounts, Reports, Categories, Settings). The active tab has a filled pill highlight. In Night, a circular accent **+/mic** button sits in the centre. In Pocket, the active tab is a soft grey pill with a blue icon. Height 64, bottom margin = safe area + 12.
9. **Composer**: `Speak | Type` segmented control plus the mic or text field (see section 7).
10. **Keypad**: 3x4 dark keys with a hairline border and a backspace key, used for manual amount entry (Dark set B). Includes `.` and `00`.
11. **BottomSheet**: top-rounded, grab handle, scrim, swipe-down to dismiss, keyboard-safe.
12. **ConfirmSheet**: gradient hero (a TexturedCard) showing the big amount and a "Change amount" chip that opens the keypad; below it rows for Category (with squircle icon, chevron), Date (calendar icon, "Today"), Note; bottom action row: cancel (✕), attach (optional, later), confirm (✓, white or accent, wide).
13. **Charts** (SVG, section 6).
14. **PocketStack**: the stacked account cards peeking out above the main card (section 8).
15. **PassbookLedger**: the passbook table (section 8).
16. **Toast/Snackbar** for auto-add with Undo and Edit.

---

## 6. Charts (react-native-svg, no chart library)

Common rules: no gridlines or very faint ones, minimal axes, rounded shapes, animate in once (grow or sweep, 400–600 ms), respect reduced-motion settings, handle empty and one-point data, tooltips on tap.

1. **Donut:** thick stroke (about 18% of the diameter), rounded caps, small gaps between segments, centre label ("Total expenses" in muted text and the amount in large text). Segment colours come from category colours. Optional gradient strokes (Dark set A). Legend below in two or three columns: coloured dot, name, amount, percent.
2. **Weekly/Monthly bars:** rounded bars. Unselected bars use `chartTrack` (Night) or a pale tint (Pocket); the selected bar uses a vertical gradient (periwinkle to violet in Night, blue in Pocket) with a floating value pill above it. Labels Mon–Sun or day numbers underneath. Tap or drag to select. Scroll horizontally for a whole month if needed.
3. **Cashflow line (Home, Pocket style):** thin 2 px line, small filled end dot, soft gradient area under the line, dashed continuation for the rest of the month, day ticks 1, 5, 10, 15, 20, 25, 30. In Night, use the same data as two thin lines (income, expense) or the bar chart.
4. **Semicircle gauge:** three or four coloured arcs with rounded ends (Pocket "Spending" card) showing top categories, with the total in the centre.
5. All charts take plain data arrays and theme tokens; unit-test the data-preparation functions (scales, segment angles, empty states).

---

## 7. Screens (layouts for both themes)

### 7.1 Home
- Header: greeting plus month switcher (◀ October 2026 ▶) and a small settings or bell icon.
- **Hero card** (Net balance for the month):
  - **Night:** a TexturedCard (aurora or cosmos) with "Net this month", the big amount, an eye toggle, an `Income` and `Expense` chip pair, then a row of four **GlassButtons**: Speak, Type, Income, More.
  - **Pocket:** the **PocketStack** (account cards peeking above) over a blue main card with the big serif amount, an eye toggle, a "+x% vs last month" chip, and four frosted glass buttons.
- **Cashflow card:** daily chart for the month with "Money in" and "Money spent" totals above it.
- **Category breakdown card:** `Expense | Income` segmented control, donut, legend.
- **Recent 5** list with "View all".
- **FloatingNav** pinned at the bottom; the **Composer** mic is the nav's centre button (Night) or a floating mic button above the nav (Pocket). In Type mode a text field slides up above the nav.

### 7.2 Accounts
- Header with the total (Net worth) and three tiles: Bank, Cash, Investments (amount each).
- A vertical **stack of account cards** (TexturedCards, partly overlapping like a wallet): name, institution, balance, masked account number (last 4 only), "tap to open passbook". Investment cards show value, last updated, and change.
- Floating "+ Add account". A lock icon opens the Vault.

### 7.3 Account detail: **Passbook**
A bank-passbook look for bank and cash accounts:
- Top: the account card, with a "Current balance" line.
- Below, a **PassbookLedger**: columns `Date | Particulars | Debit | Credit | Balance`, one row per transaction, newest first, with a running balance (computed in the Repository and unit-tested). Month dividers in the table ("October 2026").
- **Pocket:** paper look (`paper` background, ruled lines in `paperLine`, serif for particulars, small caps headers). **Night:** dark ledger on `surface` with hairlines.
- Investments instead show a value history chart (line) and an "Update value" button.
- Actions: Add transaction to this account, Edit account, Archive.

### 7.4 Reports (analytics style)
- Top segmented control `Expenses | Income`, then period chips (Week, Month, Quarter, Year, Custom).
- A large card with the total, a period dropdown, and the bar chart with a highlighted bar and a tooltip.
- A 2-column grid of **CategoryTiles** (category, amount), then the ranked category list with percentages, then the plain-language insights, then the 5 largest transactions.

### 7.5 Categories
- `Expense | Income` segmented control, a list of squircle icons with names and a drag handle, "+ Add category" opens a sheet with name, icon grid, colour swatches, and a preview.

### 7.6 Add / confirm
- The **ConfirmSheet** (section 5) for voice and typed entries when confirmation is needed.
- Manual add uses the same sheet with the **Keypad** for the amount.

### 7.7 Settings and Backup
- Grouped cards: Appearance (theme), Voice, Add behaviour, Accounts defaults, Vault, Backup & Restore (status card with last backup time, "Back up now"), Import / Export, About.

---

## 8. PocketStack and Passbook details

**PocketStack (light/Pocket Home):** three or four slim coloured cards (name left, balance right) stacked with a 22 px vertical offset behind the main card. The main card has a curved top edge (a shallow concave "pocket" shape) with a dashed stitch line, drawn as an SVG path. On first load the cards slide up from inside the pocket (staggered, 350 ms). Tapping a peeking card opens that account. Colours come from the accounts' own colours (green, yellow, black, and so on).

**Passbook rules:** running balance for a bank or cash account = opening balance + income − expense, ordered by date then created time; transfers are out of scope for now. Show an "opening balance" row at the bottom. Export-to-CSV for a single account is allowed (no vault data).

---

## 9. Motion

- Page and sheet transitions: 200–300 ms ease-out. Haptic tick on save, success, delete, and tab change.
- Number count-up on balance changes (400 ms). Bars grow from the baseline; the donut sweeps clockwise; the line draws left to right.
- PocketStack slides up; the nav's active pill slides between tabs.
- Mic: a soft pulsing ring while listening; waveform bars while speech is detected.
- Respect the system "reduce motion" setting: replace animations with instant changes.

---

## 10. Implementation phases (UI work, after the UI kit refactor "Phase 1b")

| Phase | Work | Done when |
|---|---|---|
| D1 | Install assets in `assets/textures/`; ThemeProvider with Night and Pocket tokens; fonts (Newsreader or fallback); `useTheme()`; theme switch in Settings | Switching the theme re-colours every existing screen without restart |
| D2 | Restyle kit components: Button, Card, TexturedCard, Segmented, AmountText, CategoryIcon/Tile, TransactionRow, FloatingNav, BottomSheet, Keypad | Component Gallery shows every component in both themes and all states |
| D3 | Charts: donut, bars, line, gauge, with unit tests for data prep | Charts render with empty, one-point, and 12-month data in both themes |
| D4 | Home (both hero variants), Composer, ConfirmSheet, snackbar | Home matches this spec in both themes |
| D5 | Accounts: stack, detail, Passbook ledger, Vault styling | Passbook running balances are tested and render correctly |
| D6 | Reports, Categories (icon and colour picker) | All periods and pickers work |
| D7 | Settings, Backup screens, empty and error states, motion polish, reduced-motion | Everything in sections 7 and 9 is done |
| D8 | QA: contrast check on both themes (4.5:1), 360 px width review, long-text and large-font-size review, list performance check | Screens look right at 360 px, no clipped text, no raw colour strings outside `tokens.ts` |

Rules for every phase: no `eas` commands; avoid new native packages (everything above works with `react-native-svg`, `@expo/vector-icons`, `expo-font`, and Reanimated, all already installed); run `npm run prebuild-check`; commit, tag (`ui-D1` ...), push; never force push; keep the Component Gallery current; do not weaken tests.

**Performance budget:** each texture is about 200 KB; load them lazily and cache; do not mount more than three TexturedCards off-screen at once; prefer FlatList virtualization for long lists.

**Accessibility:** touch targets at least 48 px, labels for icon-only buttons, amounts readable with large system font sizes (let layouts wrap or shrink gracefully), colour never the only signal (income and expense also carry a +/− sign).
