# Humanly — Production Deployment Guide

This guide walks you through deploying **Humanly** to production using 100% free-tier services: **Cloudflare Pages** (hosting + serverless functions), **Supabase** (authentication + database), and **Google Gemini API** (AI engine).

---

## 1. Prerequisites Checklist
- [x] Node.js 18+ and npm installed locally.
- [x] Free Cloudflare account ([cloudflare.com](https://cloudflare.com)).
- [x] Free Supabase account ([supabase.com](https://supabase.com)).
- [x] Google AI Studio Gemini API Key ([aistudio.google.com](https://aistudio.google.com)).

---

## 2. Supabase Setup (5 Minutes)

### Step 2.1: Run Database Migration
1. Log into your project at [app.supabase.com](https://app.supabase.com).
2. Navigate to **SQL Editor** in the left sidebar.
3. Click **New Query**.
4. Open the migration file in this repository:
   ```bash
   supabase/migrations/001_initial_schema.sql
   ```
5. Paste the entire SQL content into the query editor and click **Run**.
6. Verify that the following tables now exist under **Table Editor**:
   - `profiles`
   - `usage_tracking`
   - `feedback`

### Step 2.2: Configure Authentication & Redirect URLs
1. In Supabase, go to **Authentication** > **URL Configuration**.
2. Set **Site URL** to your production domain (or Cloudflare Pages URL, e.g. `https://humanly.pages.dev`).
3. Under **Redirect URLs**, add:
   - `http://localhost:5173/**` (for local development)
   - `https://<your-project>.pages.dev/**` (for Cloudflare Pages)
   - `https://<your-custom-domain>/**` (if using custom domain)
4. Under **Authentication** > **Email**, toggle **Confirm email** according to preference (for public beta, you can disable email confirmation for frictionless signup).

---

## 3. Cloudflare Pages Deployment

### Option A: Deploy via GitHub (Recommended)
1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: complete Humanly AI SaaS build"
   git push origin main
   ```
2. Log into the [Cloudflare Dashboard](https://dash.cloudflare.com).
3. In the sidebar, select **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
4. Select your `humanizer-saas` repository and click **Begin setup**.
5. Set the build settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
6. Click **Save and Deploy**. Cloudflare Pages will build the frontend and automatically compile the serverless endpoints in the `functions/` directory!

### Option B: Deploy via Wrangler CLI
You can also deploy directly from your local terminal using Wrangler:
```bash
npm run build
npx wrangler pages deploy dist --project-name=humanly
```

---

## 4. Production Environment Variables

In the Cloudflare Dashboard, go to your Pages project:
**Settings** > **Environment variables** > **Add variables** for Production:

| Variable Name | Value / Description | Sensitive? |
| :--- | :--- | :---: |
| `VITE_APP_NAME` | `Humanly` | No |
| `VITE_SUPABASE_URL` | Your Supabase Project URL (`https://xyz.supabase.co`) | No |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase Publishable / Anon Key | No |
| `GEMINI_API_KEY` | Your Google Gemini API Key | **Yes (Encrypt)** |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | No |
| `SUPABASE_URL` | Your Supabase Project URL | No |
| `SUPABASE_ANON_KEY` | Your Supabase Anon Key | **Yes (Encrypt)** |
| `APP_ENV` | `production` | No |
| `MAX_WORDS_PER_REQUEST` | `800` | No |
| `BETA_DAILY_REQUESTS_PER_USER` | `3` | No |
| `GLOBAL_DAILY_REQUEST_CAP` | `500` | No |
| `MODEL_REQUESTS_ENABLED` | `true` | No |

---

## 5. Post-Deployment Verification Checklist

Once deployed, run these checks against your production URL:
1. **Health Check**:
   ```bash
   curl https://<your-project>.pages.dev/api/health
   ```
   Should return:
   ```json
   {"status":"healthy","modelEnabled":true,"version":"1.0.0-beta"}
   ```
2. **Editor Test**:
   - Visit `https://<your-project>.pages.dev/editor`.
   - Submit a test draft (e.g. 50 words) across multiple tones.
   - Confirm that the rewrite appears and character counts update.
3. **Daily Limit Test**:
   - Check that quota decreases appropriately.
4. **Auth Flow**:
   - Sign up with a test email, log out, and sign back in.
