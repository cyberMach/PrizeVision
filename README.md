# PrizeVision 🏆

**Smart lottery ticket tracker with AI-powered number picks and automatic draw checking.**

PrizeVision lets you photograph a lottery coupon, OCR it, confirm the numbers, and automatically check results on draw day — all from your phone. Built with Expo SDK 58 and React Native 0.88.

---

## Features

### 🤖 AI Lucky Picks
Analyzes the last 50 EuroMillions draws using frequency scoring (70% historical + 30% recent API data) combined with Monte Carlo sampling. Generates 5 boards with confidence scores — tap to select, save to your ticket list in one tap.

### 📷 Coupon Scanner
Photograph any lottery coupon. OCR.space extracts the text, the parser identifies your played boards (`N.N / E` row pairs), and the confirm screen lets you review and correct any number before saving.

### ⏱️ Live Jackpot & Countdown
Home screen shows the current EuroMillions jackpot with a live GÜN / SAAT / DAKİKA countdown to the next draw (every Tuesday and Friday at 21:00 CET).

### 🔔 Auto-Check on Draw Days
Background fetch + push notifications check your pending tickets automatically on draw days. You get a notification the moment results are in.

### 📊 Ticket History & Earnings Report
Full history of every ticket — pending, checked, won. Report tab shows total prize, win rate, and a monthly earnings bar chart.

---

## Screenshots

| Home | AI Picks | Scan | Report |
|------|----------|------|--------|
| *(coming soon)* | *(coming soon)* | *(coming soon)* | *(coming soon)* |

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Expo SDK 58 · React Native 0.88 · React 19 |
| Language | TypeScript |
| Routing | Expo Router (file-based, `app/` directory) |
| Persistence | AsyncStorage (`pv_tickets`) |
| Notifications | `expo-notifications` + `expo-background-fetch` |
| OCR | [OCR.space](https://ocr.space) free tier |
| Draw results | [lotteryresultsfeed.com](https://www.lotteryresultsfeed.com) REST API |
| Jackpot data | [magayo Lottery Data API](https://www.magayo.com/lottery-docs/api/) |
| Build | EAS Build (APK preview / AAB production) |

### Design System — *Luminous Prime*
Dark-mode palette with four accent tones:

| Token | Hex | Use |
|-------|-----|-----|
| Sage | `#8D8773` | Muted text, borders |
| Dark Forest | `#0C3B2E` | Primary background |
| Golden Bronze | `#BB8A52` | Accent, score badges |
| Bright Gold | `#FFBA00` | CTAs, jackpot figures, balls |

---

## Getting Started

### Prerequisites
- Node.js 18+
- [EAS CLI](https://docs.expo.dev/eas/): `npm install -g eas-cli`
- An [Expo](https://expo.dev) account

### Install

```bash
git clone https://github.com/cyberMach/PrizeVision.git
cd PrizeVision
npm install --legacy-peer-deps
```

### Environment variables

Create `.env` in the project root (never commit this file):

```env
EXPO_PUBLIC_LOTTERY_API_KEY=your_lotteryresultsfeed_bearer_token
EXPO_PUBLIC_LOTTERY_BASE_URL=https://www.lotteryresultsfeed.com/api
EXPO_PUBLIC_OCR_SPACE_API_KEY=your_ocr_space_api_key
EXPO_PUBLIC_MAGAYO_API_KEY=your_magayo_api_key
```

> All keys use the `EXPO_PUBLIC_` prefix — they are inlined at build time by Expo's Metro bundler.

| Key | Where to get it |
|-----|-----------------|
| `EXPO_PUBLIC_LOTTERY_API_KEY` | [lotteryresultsfeed.com](https://www.lotteryresultsfeed.com) — Bearer token, paid plans |
| `EXPO_PUBLIC_OCR_SPACE_API_KEY` | [ocr.space/ocrapi](https://ocr.space/ocrapi) — free tier, no card required |
| `EXPO_PUBLIC_MAGAYO_API_KEY` | [magayo.com](https://www.magayo.com/lottery-docs/api/) — free tier |

### Run locally (Metro / Expo Go)

```bash
npm start
```

Scan the QR code with **Expo Go**. The installed Expo Go version must match `expo` in `package.json` exactly (SDK 58).

> After editing `.env`, restart Metro with cache clear:
> ```bash
> npx expo start -c
> ```

### Build APK (Android)

```bash
eas build -p android --profile preview
```

Download the `.apk` from the EAS dashboard and sideload it — no Play Store needed.

### Build AAB (Play Store)

```bash
eas build -p android --profile production
```

---

## Project Structure

```
app/
  (tabs)/
    index.tsx        # Home — jackpot card, ticket list, FABs
    picks.tsx        # AI Lucky Picks — frequency analysis + save
    scan.tsx         # Coupon scanner — camera + OCR
    history.tsx      # Ticket history
    report.tsx       # Earnings report + bar chart
  _layout.tsx        # Root stack + SafeAreaProvider
src/
  components/        # LotteryBall, TicketCard, …
  services/
    api.ts           # lotteryresultsfeed.com calls
    aiPicks.ts       # Frequency analysis + Monte Carlo
    ocrService.ts    # OCR.space integration
    storage.ts       # AsyncStorage helpers
    notifications.ts # expo-notifications + background fetch
  theme/
    tokens.ts        # Luminous Prime design tokens
  types/             # Shared TypeScript interfaces
```

---

## API Notes

- **lotteryresultsfeed.com** — Bearer token in `Authorization` header (not query string). Free tier caps result range to the last 1 month; the `warning` field on check responses surfaces this.
- **OCR.space** — Images are downscaled below 1 MB before upload (free tier limit). The parser targets the `N.N / E` row structure found on Portuguese and Spanish EuroMillions/EuroJackpot coupons.
- **magayo** — Jackpots cached 30 min in memory. Falls back to the static placeholder in `lotteries.ts` on failure.

---

## License

MIT © 2026 cyberMach
