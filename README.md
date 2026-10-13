# Humanly — AI Writing Humanizer SaaS

> **Write naturally. Sound like you.**  
> An editorial AI writing humanizer that improves clarity, flow, cadence, and authenticity while preserving your voice, arguments, and meaning.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite)](https://vite.dev/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages-f38020?logo=cloudflare)](https://pages.cloudflare.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20Database-3ecf8e?logo=supabase)](https://supabase.com/)
[![Gemini](https://img.shields.io/badge/Google-Gemini%20API-4285f4?logo=google)](https://ai.google.dev/)

---

## Highlights & Features

- **Anti-Cliche AI Humanizer**: Eliminates robotic vocabulary ("delve", "testament", "tapestry", "moreover") and formulaic syntax.
- **Dynamic Rhythm & Burstiness**: Interweaves varying sentence lengths to mirror organic human thought.
- **Editorial Design System**: Bespoke typography (`Inter`, `Newsreader`, `JetBrains Mono`), warm paper-inspired neutral palette, micro-interactions, and full dark-theme support.
- **Voice Customization**: 6 distinct Tones (*Professional*, *Academic*, *Conversational*, *Simple*, *Marketing*, *Creative*), 5 Audiences, and 3 Editing Strengths.
- **Zero-Retention Privacy**: Text is rewritten statelessly in memory and discarded upon delivery. No drafts are stored on disks or used for model training.
- **Cost-Protected Free Beta**: Rate-limited (3 requests/user/day, 800 words/request max, 500 global daily cap) with cryptographic SHA-256 IP hashing.
- **Dual Runtime Support**:
  - **Local Development**: Built-in Vite Dev API plugin handles `/api/*` endpoints directly without needing a separate backend server.
  - **Production**: Native Cloudflare Pages Functions in `functions/api/` for global edge latency and zero hosting costs.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 8, React Router 7, Lucide Icons, Sonner |
| **Styling** | Vanilla CSS Design System with custom tokens (`design-system.css`) |
| **Backend / Edge** | Cloudflare Pages Functions + Vite Dev Middleware Plugin |
| **AI Provider** | Google Gemini API (`gemini-3.5-flash-lite`) |
| **Auth & Database** | Supabase (PostgreSQL, Row Level Security, Auth) |
| **Quality & Tests** | Vitest, Oxlint, TypeScript strict mode |

---

## Quickstart (Local Development)

### 1. Clone & Install Dependencies
```bash
git clone <your-repo-url>
cd humanizer-saas
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your credentials:
```env
VITE_APP_NAME=Humanly
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash-lite
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser. The local dev server automatically handles frontend routes and the live `/api/v1/*` backend endpoints.

---

## Available Scripts

- `npm run dev` — Launches local development server with Vite and API middleware.
- `npm run build` — Compiles TypeScript (`tsc -b`) and produces production bundle in `dist/`.
- `npm run test` — Executes Vitest automated unit and integration tests.
- `npm run lint` — Runs Oxlint for fast, modern linting.
- `npm run preview` — Locally previews the built production bundle.

---

## Project Structure

```
humanizer-saas/
├── functions/                     # Cloudflare Pages Functions (Production Edge API)
│   └── api/
│       ├── health.ts              # GET /api/health
│       └── v1/
│           ├── humanize.ts        # POST /api/v1/humanize
│           ├── usage.ts           # GET /api/v1/usage
│           └── feedback.ts        # POST /api/v1/feedback
├── public/                        # Static assets & SVG favicon
├── src/
│   ├── app/                       # Application Views
│   │   ├── LandingPage.tsx        # Marketing & Product Tour
│   │   ├── EditorPage.tsx         # Split-screen Writing Studio
│   │   ├── AuthPage.tsx           # Sign In / Sign Up / Password Reset
│   │   ├── DashboardPage.tsx      # Quota meter & Account Overview
│   │   ├── SettingsPage.tsx       # Writing Preferences & Privacy
│   │   ├── LegalPages.tsx         # Privacy Policy & Terms of Service
│   │   └── NotFoundPage.tsx       # 404 handler
│   ├── client/                    # API client & Supabase connector
│   ├── components/layout/         # Navigation & Footer
│   ├── hooks/                     # Auth context hook (useAuth)
│   ├── server/                    # Core AI & Rate-Limiting Logic
│   │   ├── humanizer.ts           # Gemini prompt builder & engine
│   │   ├── rate-limiter.ts        # Quota enforcement & IP hashing
│   │   └── dev-middleware.ts      # Vite dev server middleware
│   ├── shared/                    # Shared Zod schemas & types
│   ├── styles/                    # Design System CSS
│   └── test/                      # Vitest test suite
├── supabase/                      # Database migrations
│   └── migrations/
│       └── 001_initial_schema.sql
└── docs/                          # Comprehensive Documentation
    ├── IMPLEMENTATION_PLAN.md
    ├── DEPLOYMENT_GUIDE.md
    ├── SUPABASE_SETUP.md
    └── API_DOCUMENTATION.md
```

---

## Documentation Links

- [Implementation Plan & Architecture](file:///docs/IMPLEMENTATION_PLAN.md)
- [Production Deployment Guide](file:///docs/DEPLOYMENT_GUIDE.md)
- [Supabase Setup & SQL Migrations](file:///docs/SUPABASE_SETUP.md)
- [API Documentation](file:///docs/API_DOCUMENTATION.md)

---

## License
MIT License. Built for independent creators and bootstrapped SaaS founders.
