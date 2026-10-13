# Humanly — Implementation Plan & Architectural Blueprint

## 1. Executive Summary & Vision
**Humanly** is an AI writing humanizer designed for professionals, students, and content creators who need their writing to sound natural, nuanced, and authentic. Unlike tools that merely substitute synonyms or run crude spinner algorithms, Humanly focuses on:
- Eliminating robotic AI sentence cadence and cliches ("delve", "testament", "tapestry", "moreover").
- Dynamically varying sentence lengths (burstiness).
- Honoring selected voice dimensions (Tone, Audience, Strength).
- Preserving the author's core thesis and factual accuracy.
- Zero-retention privacy: user drafts are never saved to disk or used for training.

---

## 2. Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                       Browser Client                        │
│   React 19 + TypeScript + Vite 8 + CSS Design System        │
│   React Router 7 + Lucide Icons + Sonner + Zod + Hook Form  │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON API
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Cloudflare Pages Functions                  │
│       (Or Vite Dev Server Middleware during local dev)      │
│  - /api/v1/humanize (POST)                                  │
│  - /api/v1/usage (GET)                                      │
│  - /api/v1/feedback (POST)                                  │
│  - /api/health (GET)                                        │
│  - Rate Limiter (SHA-256 IP Hashing / User Quota)           │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌─────────────────────────────┐
│      Google Gemini API       │ │      Supabase Cloud         │
│   (gemini-3.5-flash-lite)    │ │   - Auth (Email & OAuth)    │
│   - Custom Humanizer Prompts │ │   - Profiles Table          │
│   - Temperature/TopP Tuning  │ │   - Usage Tracking Table    │
│   - Output Sanitization      │ │   - Row Level Security      │
└──────────────────────────────┘ └─────────────────────────────┘
```

### Component Details
1. **Frontend**:
   - Modern React 19 application built with Vite 8.
   - Design System with CSS variables (`design-system.css`) covering warm neutral palettes, responsive typography (`Inter`, `Newsreader`, `JetBrains Mono`), micro-animations, and full dark-theme support.
   - Client routing via `react-router-dom`: Landing page, Split-screen Editor, Dashboard, Auth, Settings, Privacy, and Terms.
   - Client-side token validation and session caching via `@supabase/supabase-js`.
2. **Backend**:
   - Cloudflare Pages Functions located in `functions/api/`.
   - Synchronized Vite Dev Middleware plugin (`dev-middleware.ts`) providing instantaneous local development without needing separate servers or emulators.
   - Robust rate limiting with cryptographic SHA-256 IP hashing (preserving GDPR compliance with zero raw IP storage) and daily request quotas.
3. **AI Engine**:
   - Google Gemini API integration using `gemini-3.5-flash-lite` (with fallback support).
   - Tailored system prompts enforcing rhythm variation, cadence improvement, and anti-cliche filtering.

---

## 3. Implemented Features & Status Matrix

| Component / Feature | Status | Details |
| :--- | :---: | :--- |
| **Landing Page** | `Implemented` | Editorial design, interactive preview, feature matrix, FAQ, CTA, responsive |
| **Split-Screen Editor** | `Implemented` | Real-time word counter, Tone/Strength/Audience controls, copy/clear/diff, loading states |
| **Authentication Flow** | `Implemented` | Sign In, Sign Up, Password Reset, session persistence via Supabase Auth |
| **User Dashboard** | `Implemented` | Real-time daily quota meter, tier information, recent usage statistics |
| **Settings Page** | `Implemented` | Tone presets, data handling transparency, privacy policy link, danger zone |
| **Legal Pages** | `Implemented` | Comprehensive Privacy Policy (zero retention) and Terms of Service |
| **AI Humanizer Engine** | `Implemented & Tested` | Prompt engineering, anti-cliche filters, burstiness variation, live Gemini test |
| **Rate Limiter & Quotas** | `Implemented & Tested` | 3 requests/day free tier, 800 words/request limit, 500 global safety cap, IP hash |
| **Dev API Middleware** | `Implemented & Tested` | Vite plugin handling `/api/*` in local dev with live Gemini and Supabase keys |
| **Cloudflare Functions** | `Implemented` | Ready to deploy directly to Cloudflare Pages via GitHub or CLI |
| **Supabase SQL Migration** | `Implemented` | `001_initial_schema.sql` with profiles, usage_tracking, feedback, RLS policies |
| **Automated Test Suite** | `Implemented & Tested` | 11 unit & integration tests passing in Vitest (`vitest run`) |
| **Linting & Type Safety** | `Implemented & Tested` | 0 errors, 0 warnings across Oxlint and TypeScript compiler |

---

## 4. Key Security & Cost Control Controls
1. **Zero Secret Leakage**: No Gemini API keys or Supabase service role keys are exposed to the client bundle. All sensitive environment variables stay in backend runtime environment.
2. **Strict Daily Beta Quotas**: Users are limited to 3 requests per day and 800 words per request.
3. **Global Safety Kill Switch**: In the event of traffic surges or abuse, `MODEL_REQUESTS_ENABLED=false` immediately pauses model requests without taking down the application.
4. **GDPR / Privacy Compliance**: Client IPs are hashed with SHA-256 and salt before logging. Raw IPs and user text are never stored.
