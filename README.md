# FACECHAT 🎥🌍
> "Meet someone new. Talk face-to-face with people from around the world."

FaceChat is a modern global stranger video-chat web platform built with a Gen-Z aesthetic, server-authoritative economy, and real-time WebRTC communication.

---

## 🌟 Architecture Overview

```
facechat/
├── frontend/               # Next.js 14 (App Router), React, TypeScript, Tailwind CSS
│   ├── src/
│   │   ├── app/            # Pages: Landing, Age Gate, Setup, Chat, Wallet, Female Pass, Auth, Admin
│   │   ├── components/     # UI Design System, Modals, Navbar, Footer, CoinDisplay
│   │   ├── lib/            # WebRTC Manager, Socket.IO Client, Axios API client, Media Utils
│   │   ├── store/          # Zustand State Stores (Auth, Wallet, Call)
│   │   └── types/          # Shared frontend TypeScript interfaces
│   ├── tailwind.config.js  # Brand styling & design tokens
│   └── next.config.js      # Next.js configuration
│
├── backend/                # Node.js, Express, Socket.IO, TypeScript, PostgreSQL, Redis
│   ├── src/
│   │   ├── config/         # Centralized business economics & environment settings
│   │   ├── db/             # PostgreSQL connection pool & automatic migration schema
│   │   ├── modules/
│   │   │   ├── auth/       # Registration, Login, JWT, Google OAuth, Password Reset
│   │   │   ├── users/      # Profile, Preferences, Stats, Achievements
│   │   │   ├── wallet/     # Server-authoritative auditable ledger, earn/spend mechanics
│   │   │   ├── payments/   # Stripe Checkout, idempotent webhook processing
│   │   │   ├── subscriptions/ # Female Match Pass (12-hour server countdown)
│   │   │   ├── matchmaking/# Queue engine with preference filtering & block list
│   │   │   ├── conversations/# Call lifecycle, duration, server-side coin rewards/spend
│   │   │   ├── reports/    # Moderation reporting system (nudity, harassment, underage)
│   │   │   ├── moderation/ # User & session blocking (immediate disconnect + rematch prevention)
│   │   │   ├── security/   # 10-minute server-enforced guest sessions & anti-farming hooks
│   │   │   └── analytics/  # Event logging and business KPI aggregation
│   │   ├── websocket/      # Socket.IO WebRTC signaling server (Offer, Answer, ICE, Chat, Next, End)
│   │   ├── middleware/     # Auth, rate limiting, and request validation
│   │   └── index.ts        # Server entry point
```

---

## 🔐 Core Product Rules & Server-Authoritative Architecture

1. **Strictly 18+ Only**: Users must confirm age via explicit gate before accessing camera/media.
2. **10-Minute Guest Session**:
   - Enforced **server-side** against database `expires_at` timestamp.
   - At 8 minutes (2 mins left): subtle warning banner appears.
   - At 10 minutes: session expires, WebRTC call terminates, and registration modal appears.
3. **Face Coins Economy**:
   - Authenticated conversation economy.
   - 1,000 Face Coins = $10 USD.
   - Users earn coins as they chat based on server-side duration accounting.
   - Coins are spent during calls based on server config.
   - Ledger records transactions (`EARN`, `SPEND`, `PURCHASE`, `BONUS`, `REFUND`).
4. **Female Match Pass**:
   - $2 USD for 12 hours.
   - Unlocks female-preference matchmaking pool.
   - **Crucial Rule**: Face Coins are STILL required for conversations. Pass does NOT provide unlimited calls.
   - Expiry is tracked server-side in the database.
5. **Fast NEXT Action**:
   - Single click ends current peer connection, clears media, finalizes server coin accounting, and instantly rejoins queue for next stranger without page reload.
6. **Safety & Privacy**:
   - Zero audio/video recording.
   - Peer-to-peer WebRTC encrypted media.
   - One-click Block & Report.
   - Blocks prevent rematching in Redis & Postgres.

---

## ⚙️ Configuration & Environment Variables

All business parameters live in centralized configuration (`backend/src/config/index.ts`) and can be overridden without changing code:

```env
# Economics
GUEST_FREE_MINUTES=10
GUEST_WARNING_MINUTES=2
COINS_EARNED_PER_MINUTE=10
COINS_SPENT_PER_MINUTE=5
COIN_BUNDLE_AMOUNT=1000
COIN_BUNDLE_PRICE_USD=10
FEMALE_PASS_PRICE_USD=2
FEMALE_PASS_DURATION_HOURS=12
LOW_BALANCE_THRESHOLD=100
SIGNUP_BONUS_COINS=100

# Infrastructure
PORT=4000
DATABASE_URL=postgresql://postgres:password@localhost:5432/facechat
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:3000

# Payments (Stripe)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# WebRTC ICE
TURN_SERVER=turn:your-turn-server.com:3478
TURN_USERNAME=your-username
TURN_PASSWORD=your-password
STUN_SERVER=stun:stun.l.google.com:19302
```

---

## 🚀 Running Locally

### 1. Backend
```bash
cd backend
npm install
npm run dev
# Server starts on http://localhost:4000
# Migrations run automatically on startup
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
# App opens on http://localhost:3000
```

---

## 🧪 Testing User Flows
- **Guest Flow**: Visit `/` → Click "START TALKING" → Age Gate 18+ → Camera Check → Video Match → Chat → Next.
- **Guest Limit**: Guest warning triggers 2 mins before expiry; at 10 mins guest modal prompts sign up.
- **Authenticated Flow**: Sign up at `/auth/signup` (receives 100 free coins welcome bonus) → Chat → Wallet at `/wallet` → Buy 1,000 Coins ($10).
- **Female Pass**: Visit `/female-pass` → Activate for $2 → Unlocks female preference for 12 hours.
- **Safety**: Test Report modal and Block modal on `/chat`.
- **Admin**: View `/admin` for system metrics, active users, and reports.

---

## 🚀 24/7 Cloud Deployment Guide

FaceChat can run 24/7 in the cloud without requiring your laptop to remain open:

### 1. Deploy Backend (Node.js + WebSockets) on Render (Free / Starter)
1. Go to [render.com](https://render.com) and create an account.
2. Click **New +** -> **Blueprint**.
3. Connect your GitHub repository (`facechat`). Render will automatically detect `render.yaml`.
4. Render provisions the service and gives you a backend URL like `https://facechat-backend-xxxx.onrender.com`.
5. *(Optional)* Add your Stripe and Google OAuth credentials in Environment Variables.

### 2. Deploy Frontend (Next.js 14) on Vercel (Free)
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository (`facechat`).
4. Set **Root Directory** to `frontend`.
5. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL` = `https://your-backend-url.onrender.com`
   - `NEXT_PUBLIC_WS_URL` = `https://your-backend-url.onrender.com`
6. Click **Deploy**. Vercel will build and deploy your app globally in < 60 seconds with SSL and zero downtime.

### 3. Docker / VPS Deployment
You can also run the full stack on any VPS using Docker:
```bash
docker compose up -d --build
```
This boots both the backend on port `4000` and the frontend on port `3000`.

---

## 🔒 Safety & Automatic Location Policy
- **Automatic Location Detection**: User location is auto-detected via IP and timezone signals and locked to prevent spoofing or falsified location data. Manual overrides are disabled.
- **Strict Video Policy**: FaceChat enforces active camera streams during stranger matchmaking.
- **Auditable Ledger**: Every token earned or spent is recorded in a tamper-proof wallet ledger.

---

## 📄 License
FaceChat proprietary application. All rights reserved.
