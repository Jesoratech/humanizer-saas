# Supabase Cloud Setup & Configuration Guide

This document describes how to configure your Supabase backend to support **Humanly**.

---

## 1. Quick Setup via SQL Migration

Open `supabase/migrations/001_initial_schema.sql` and run it directly in your Supabase SQL Editor.

It creates:
1. **`public.profiles`**: Stores user identity, metadata, and beta plan tier.
2. **`public.usage_tracking`**: Stores daily request and word counts for rate limits.
3. **`public.feedback`**: Stores anonymous or authenticated user feedback ratings and comments.
4. **Triggers & RLS**:
   - `handle_new_user()` trigger automatically provisions profile records on `auth.users` insert.
   - Row Level Security ensures users can only access their own records.

---

## 2. Row Level Security (RLS) Policy Reference

### Profiles Table
```sql
-- Read own profile
CREATE POLICY "Users can read their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Update own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
```

### Usage Tracking Table
```sql
-- Read own usage history
CREATE POLICY "Users can view their own usage history"
  ON public.usage_tracking FOR SELECT
  USING (auth.uid() = user_id);
```

### Feedback Table
```sql
-- Public submission allowed
CREATE POLICY "Anyone can submit feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (true);

-- Read own feedback
CREATE POLICY "Users can view their own submitted feedback"
  ON public.feedback FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 3. Verifying Setup in Supabase Dashboard

1. **Table Check**:
   Under **Table Editor**, confirm the tables `profiles`, `usage_tracking`, and `feedback` are visible.
2. **RLS Check**:
   Under **Authentication** > **Policies**, verify that RLS is marked active for all 3 tables.
3. **API Settings**:
   Under **Project Settings** > **API**:
   - Note the **Project URL** (`https://<project-ref>.supabase.co`).
   - Note the **anon / publishable key**.
