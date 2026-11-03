# Dhuttu

**The spend tracker built for India.**

Track everyday cash & UPI spends in seconds — by voice or tap — with salary-aware budgets, trip planners, and invest goals. Works as a fast web app and installs like a phone app from Chrome.

> *Dhuttu* (தட்டு / cash) — your pocket money, organised.

---

## Why Dhuttu

Most “expense apps” feel like US banking clones. Dhuttu is shaped around how money actually moves in India:

| | |
|---|---|
| **Voice in plain English / Hinglish** | *“Add 380 for Swiggy lunch”* → saved. Mic auto-parses amount, merchant & category. |
| **₹ first** | Rupees, local merchants (Swiggy, Zepto, IRCTC, petrol…), India-friendly categories. |
| **Salary → EMI → spend limit** | Set take-home, EMIs & fixed costs; Dhuttu shows what’s left for the month. |
| **Trips & investments, separate** | Trip budget vs daily spends. Monthly invest plan — not mixed into grocery chaos. |
| **AI coach on Home** | Short, readable tips on where money is going — not a wall of charts. |
| **Demo without signup** | Try everything on-device first. Cloud sync when you’re ready (Firebase). |
| **Install as an app** | PWA — Add to Home Screen / Install from Chrome. Mobile bottom nav feels native. |

---

## Features

- **Home** — today’s pulse, category charts, AI coach  
- **Spends** — full ledger with merchants & notes  
- **Budget** — salary planner, monthly limits, progress  
- **Trips** — per-trip budget and spends  
- **Investments** — monthly invest targets  
- **Profile** — theme (light / dark / system), favourite shops, CSV export, install app  
- **Add spend** — manual form *or* one-tap voice (Chrome)  
- **Responsive** — desktop sidebar; phone bottom tabs + centre mic FAB  

---

## Stack

| Layer | Tech |
|---|---|
| Web | Next.js 16, React 19, Vercel-ready |
| Mobile (optional) | Expo (`apps/mobile`) |
| Shared types | `packages/shared` |
| Auth / DB | Firebase Auth + Firestore *(optional — demo uses localStorage)* |
| AI | Gemini on the server (`GEMINI_API_KEY`) |
| Voice | Web Speech API (`en-IN`) |

Monorepo: `apps/web` · `apps/mobile` · `packages/shared`

---

## Quick start

```bash
git clone <your-repo-url> dhuttu
cd dhuttu
npm install
npm run dev:web
```

Open [http://localhost:3000](http://localhost:3000) → **Continue in demo mode**.

Voice works best in **Chrome**. Without `GEMINI_API_KEY`, a local India-aware parser still works.

### Scripts

| Command | What |
|---|---|
| `npm run dev:web` | Next.js dev server |
| `npm run build:web` | Production web build |
| `npm run dev:mobile` | Expo start |

---

## Environment

Copy the example env and fill as needed:

```bash
cp apps/web/.env.example apps/web/.env.local
```

| Variable | Required? | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Optional | Better voice parse + Home coach |
| `GEMINI_MODEL` | Optional | Default `gemini-flash-lite-latest` |
| `NEXT_PUBLIC_FIREBASE_*` | Optional | Real login + cloud sync |

Demo mode works with **zero** env vars.

---

## Deploy: Git → Vercel → Firebase

**Recommended order** — ship the site first, then plug in Firebase.

### 1. GitHub

```bash
git init
git add .
git commit -m "Initial Dhuttu"
# create repo, then:
git remote add origin <url>
git push -u origin main
```

Keep `.env.local` out of git (already ignored).

### 2. Vercel

1. Import the repo at [vercel.com](https://vercel.com)  
2. **Root Directory:** `apps/web`  
3. Add env: at least `GEMINI_API_KEY`  
4. Deploy → you get `https://….vercel.app`

### 3. Firebase (when ready)

1. Create / open a Firebase project  
2. Enable **Email/Password** (and Google if you want)  
3. Create a **Firestore** database  
4. Deploy rules: `firebase deploy --only firestore:rules` (see [`firestore.rules`](./firestore.rules))  
5. Add a **Web app** → copy config into Vercel env (`NEXT_PUBLIC_FIREBASE_*`)  
6. **Auth → Authorized domains** → add your Vercel domain  
7. Redeploy Vercel  

---

## Android (Expo)

```bash
npm run dev:mobile
cd apps/mobile
npx eas-cli login
npx eas build --platform android --profile preview
```

Set `EXPO_PUBLIC_API_URL` to your Vercel URL so the phone can call `/api/ai/parse-spend`.

---

## Privacy

- Gemini key stays on the **server** — never shipped to the browser  
- Firestore rules scope data to `users/{uid}/**`  
- Demo mode never leaves the device  

---

## Brand

**Dhuttu** — plum accent `#614051`, cash-wallet mark, light & dark logos under `apps/web/public/brand/`.

---

## License

Private / your project — update this section when you publish.
