# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Kazanan" ("Winner") is an Expo / React Native app (Expo SDK 54, RN 0.81, React 19) for Android and iOS. A user photographs a lottery coupon, OCRs it (OCR.space) to guess the picked numbers, confirms/corrects them, then checks those numbers against real historical draws via the lotteryresultsfeed.com API. Also includes a lucky-number generator and a static catalogue of European lotteries. All app state (winners, generated tickets, favorites, checked tickets) is in-memory only.

Test on a physical device with Expo Go — the installed Expo Go app version is locked to one SDK version, so the project's `expo` version in `package.json` must match it exactly or the app fails to load with a generic "Failed to download remote update" error.

## Commands

There is no test runner, linter, or build script configured beyond Expo/EAS. Available commands (from `package.json`):

```
npm start          # expo start — runs Metro bundler, scan QR with Expo Go
npm run android     # expo start --android
npm run ios         # expo start --ios
npm run build:apk    # eas build -p android --profile preview  (internal APK)
npm run build:aab    # eas build -p android --profile production (Play Store bundle)
```

There are no automated tests in this repo.

## Architecture

`App.js` → `GestureHandlerRootView` → `SafeAreaProvider` → `WinnerProvider` (`src/context/WinnerContext.js`) → `NavigationContainer` with a root Stack containing a nested bottom Tab navigator (`MainTabs`) plus three full-screen pushes:

- **`MainTabs`** (`@react-navigation/bottom-tabs`) — four tabs: `Home`, `Generate`, `History`, `Settings`.
  - **`src/screens/HomeScreen.js`** — top bar + scrollable list of `LOTTERIES` (`src/data/lotteries.js`) rendered as `LotteryCard`s (jackpot, countdown, draw days, flag). Two floating buttons at the bottom: "Check Ticket" → pushes `TicketChecker`, "Generate Ticket" → switches to the `Generate` tab.
  - **`src/screens/GenerateScreen.js`** — lucky-number generator. `Dropdown`s for lottery + board count, generates boards via `generateBoard()` (pure client-side RNG, no API), renders `LotteryBall`s, supports per-board reroll/favorite/share. Every full "Generate New Numbers" press is logged via `addGeneratedTicket`.
  - **`src/screens/HistoryScreen.js`** — tabs over `generatedTickets`, `favoriteBoards`, `checkedTickets`, `winners` from `WinnerContext`.
  - **`src/screens/SettingsScreen.js`** — static preference rows; most actions are non-functional placeholders (the app has no backend/persistence to back them).
- **`src/screens/TicketCheckerScreen.js`** (pushed, route `TicketChecker`) — lets the user pick/take a coupon photo (`expo-image-picker`), runs `performOCR` (`src/services/ocrService.js`) to get raw text, then navigates to `ConfirmNumbers` with `{ rawText }`. Does not call the draw API itself.
- **`src/screens/ConfirmNumbersScreen.js`** (pushed, route `ConfirmNumbers`) — OCR cannot reliably tell which numbers on a real coupon are "your picks" vs. other printed text, so this screen makes the user confirm before anything is submitted. It parses the coupon's actual row structure via `extractPlaysFromCoupon(rawText)` (see below) to pre-fill main/bonus per play exactly, auto-guesses the lottery brand via `guessLotteryFromText(rawText)`, shows a play-selector chip row when the coupon has multiple boards (a real coupon like EUROMILHÕES prints several `N.`/`E` row pairs on one slip), and shows the OCR-detected draw date plus whether a cached past result already exists for it (`findResultForDate`, informational only — the real comparison still happens via `checkTicketNumbers()`). The user can still freely retoggle any number on the grid before submitting. On submit, calls `checkTicketNumbers()` (`src/services/drawService.js`) and navigates to `Result`.
- **`src/screens/ResultScreen.js`** (pushed, route `Result`) — reads `{ lottery, balls, bonus, check, drawDate }` from `route.params`, where `check` is the raw `{ draws_checked, wins, total_prize, has_jackpot, results, warning }` object the API returned. On mount (ref-guarded so it only fires once) calls `addCheckedTicket` always, and `addWinner` if `check.wins > 0`.
- **`src/screens/LotteryDetailsScreen.js`** (pushed, route `LotteryDetails`) — jackpot/odds/draw-schedule view for one entry from `LOTTERIES`, with the jackpot/cash-value figures live via `useLiveJackpot` (see "Live jackpot data" below) instead of the static catalogue placeholder when available; "Generate Numbers" button navigates into the nested tab (`navigation.navigate('MainTabs', { screen: 'Generate', params: { lotteryId } })` — a bare `navigate('Generate', ...)` from a root-stack screen does **not** reach a tab nested inside `MainTabs`, this explicit form is required).

`WinnerContext` holds all app state in-memory (no persistence — resets on reload): `winners` (winning history), `generatedTickets` (every Generate-screen batch), `favoriteBoards` (favorited boards, keyed by lottery+numbers, independent of ticket history), `checkedTickets` (every ticket ever checked, win or lose).

### Design system

`src/theme/tokens.js` holds the "Luminous Prime" dark-mode design tokens (colors, typography, radius, spacing, shadows) lifted from the Tailwind mockups in `src/baglamlar/*/code.html` + `DESIGN.md`. Reusable UI lives in `src/components/` (`GlassCard`, `LotteryBall`, `LotteryCard`, `Dropdown`, `Buttons`, `Icon` — a thin `@expo/vector-icons` `MaterialIcons` wrapper, `TopBar`).

### Lottery catalogue vs. the real draw-checking API

`src/data/lotteries.js` exports `LOTTERIES` — 12 European lotteries with real ball-count rules (`mainCount`/`mainMax`/`bonusCount`/`bonusMax`) verified against the actual lotteryresultsfeed.com catalogue. Each entry also carries `apiId`/`apiSlug`/`apiCountry` mapping it to that service's real lottery — **except** Lotto Belgium, Swiss Lotto, and Luxembourg Lotto, which don't exist in that API at all (`apiId: null`; no `be`/`ch`/`lu` country in their catalogue). `CHECKABLE_LOTTERIES = LOTTERIES.filter(l => l.apiId != null)` is the list actually offered in `ConfirmNumbersScreen`'s lottery picker — Generate/Home still show all 12, since number generation is pure client-side RNG and doesn't need the API. Each entry also carries `aliases` (brand-name strings as they appear on real coupons, e.g. `'euromilhoes'` for EuroMillions) used by `guessLotteryFromText()` to auto-select the lottery on the confirm screen, and `magayoGame` (see "Live jackpot data" below).

If you ever need to re-verify or extend the `apiId`/`apiSlug`/`apiCountry` mapping, lotteryresultsfeed.com's docs are public at `/api-docs/*` (introduction, authentication, lotteries, results, results-checker, etc.) and `GET /api/lottery/lotteries?country=<cc>` (Bearer auth) returns the live catalogue per country. Supported `country` values as of writing: `us, ca, de, it, ie, uk, fr, za, au, nz, br, es` (confirmed via `GET /api/lottery/countries`).

### Live jackpot data

`LOTTERIES` no longer hardcodes real-money jackpot figures as a source of truth — `jackpot`/`cashValue` on each entry are only the placeholder shown before a live value loads or when none exists. `src/services/jackpotService.js`'s `fetchJackpot(magayoGame)` calls magayo's Lottery Data API (`GET https://www.magayo.com/api/jackpot.php?api_key=<MAGAYO_API_KEY>&game=<magayoGame>`, free tier, no billing) and caches each game's result for 30 minutes (module-level `Map`, not persisted). `src/hooks/useLiveJackpot.js` wraps this per-lottery: it returns the live value once loaded, otherwise the static placeholder, and `isLive: false` for the three lotteries with `magayoGame: null` (Lotto Belgium, Swiss Lotto, Luxembourg Lotto aren't in magayo's catalogue either) or if the fetch fails. `LotteryCard` and `LotteryDetailsScreen` both consume this hook. Each `LOTTERIES` entry's `magayoGame` was mapped against magayo's published game-code list (e.g. `euromillions`, `eurojackpot`, `es_primitiva`, `de_lotto`, `it_super` for the SuperEnalotto-style "Lotto Italia" entry, `ie_lotto`, `fr_loto`) — re-check `https://www.magayo.com/lottery-docs/api/supported-games/` if a code ever needs updating.

### OCR → confirm → check pipeline

- `src/services/ocrService.js` — downscales the photo with `expo-image-manipulator` (camera/gallery photos are often several MB; OCR.space's free tier rejects anything over ~1MB, so it retries at shrinking width/quality until under that), POSTs to OCR.space (`api.ocr.space/parse/image`, free tier, no billing/credit-card required unlike Google Vision), returns `{ date, rawText }` from `ParsedResults[0].ParsedText`. Two parsers consume `rawText`:
  - `extractPlaysFromCoupon(text)` — the primary parser, modeled on real European lottery coupon layouts (e.g. a Portuguese EUROMILHÕES slip): each played board prints as a `"N.N <5 main numbers>"` line immediately followed by an `"E <1-2 bonus numbers>"` line, repeated once per board on the same coupon. Returns `[{ play, main, bonus }, ...]`, one entry per board — `ConfirmNumbersScreen` lets the user switch between boards via chips when more than one is found.
  - `extractCandidateNumbers(text)` — a flatter fallback (every distinct 1-2 digit number in reading order) used only when `extractPlaysFromCoupon` finds no row matches at all (badly-OCR'd or non-standard coupon layout).
  - `extractDrawDate(text)` is exported too — it looks for a date on the line containing `"SORT"` (the draw-date line) before falling back to the first date-shaped substring anywhere in the text, since coupons also print a separate purchase timestamp that must not be confused with the draw date.
- `src/data/lotteries.js`'s `guessLotteryFromText(text)` matches the coupon's printed brand name (e.g. `"EUROMILHÕES"`) against each lottery's `aliases` to auto-select it in the dropdown; longest-alias-wins so a generic alias like `"loto"` can't shadow a more specific one.
- `src/screens/ConfirmNumbersScreen.js` — the real "did this OCR read the right numbers" gate. A coupon photo has many numbers on it (picks, barcodes, prices, dates) that OCR cannot disambiguate; this screen always makes the user explicitly tap-confirm which numbers are main vs. bonus before anything is submitted, even though it now pre-fills from the parsed play data.
- `src/services/drawService.js` — `Authorization: Bearer ${LOTTERY_API_KEY}` on every call (not a query-string key — that was the original bug). `fetchLatestResults(apiId, { limit })` → `GET /lottery/results`, cached per `apiId:limit` for 10 minutes. `findResultForDate(apiId, dateStr)` reuses that cache to look up a specific draw date (normalizing `/` vs `-` separators) — used by `ConfirmNumbersScreen` to show an informational "sonuç bulundu" hint before the user even submits; it does not replace `checkTicketNumbers`. `checkTicketNumbers({ apiId, balls, bonus, range })` → `POST /lottery/check`, returns the `check` object (`draws_checked`, `wins`, `total_prize`, `has_jackpot`, `results[]`, and sometimes a `warning` string — the free tier silently caps `range` to the last 1 month and reports that via `warning`, so always surface it to the user rather than silently ignoring it).

A previously-existing parallel/legacy implementation (`pages/`, `google_vision.js`, `draw_fetcher.js`, `coupon_validator.js`, etc.) duplicated this responsibility with a different (ticket-serial-number) data model and was removed for being unreferenced, broken, and incompatible with how the real draw-checking API actually works.

### Environment / config

- All secrets live in `.env` (gitignored), read via `react-native-dotenv` (`@env` alias configured in `babel.config.js`): `OCR_SPACE_API_KEY`, `LOTTERY_API_KEY`, `LOTTERY_BASE_URL`, `MAGAYO_API_KEY`. `GOOGLE_VISION_API_KEY` is a leftover from before the OCR.space migration and is unused. `react-native-dotenv` and `babel-preset-expo` must be present in `devDependencies` — they're babel-time only and easy to accidentally drop.
- After editing `.env`, restart the Metro bundler with `npx expo start -c` (clear cache) — `react-native-dotenv` inlines values at build time, so a running bundler won't pick up changes.
- `npx expo export --platform android` compiles to Hermes bytecode and is a good way to catch real bundling/dependency errors without a device, but is not required for Expo Go testing (Expo Go only needs the plain JS bundle Metro serves at `/node_modules/expo/AppEntry.bundle`).
