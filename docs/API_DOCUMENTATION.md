# Humanly — API Specification

Base URL:
- Local Development: `http://localhost:5173/api`
- Cloudflare Pages Production: `https://<your-project>.pages.dev/api`

---

## 1. POST `/api/v1/humanize`
Rewrites draft text to improve naturalness, cadence, and human flow according to specified stylistic criteria.

### Headers
- `Content-Type: application/json` (Required)
- `Authorization: Bearer <supabase_jwt>` (Optional — used to associate request with authenticated account)

### Request Body
```json
{
  "text": "In today's fast-paced world, it is vital to delve into multifaceted solutions...",
  "tone": "professional",
  "audience": "general",
  "strength": "balanced",
  "preserveStructure": true
}
```

#### Field Specifications:
- `text` (string, required): Draft to rewrite. Max 800 words in free beta.
- `tone` (enum, required):
  - `'professional'` — Articulate, polished, poised.
  - `'academic'` — Scholarly, rigorous, analytical.
  - `'conversational'` — Natural, approachable peer-to-peer.
  - `'simple'` — Plain English, short sentences.
  - `'marketing'` — Energetic, persuasive, engaging.
  - `'creative'` — Expressive, distinctive, evocative.
- `audience` (enum, required):
  - `'general'` | `'technical'` | `'business'` | `'academic'` | `'casual'`
- `strength` (enum, required):
  - `'light'` — Polish awkward phrasing; keep sentences close to original.
  - `'balanced'` — Varied cadence and dynamic sentence lengths.
  - `'strong'` — Full structural rewrite while maintaining core meaning.
- `preserveStructure` (boolean, optional, default: `true`): Retain original paragraph divisions.

### Response (200 OK)
```json
{
  "rewrittenText": "To keep up in the digital age, we need diverse solutions that drive innovation and prove real, lasting growth.",
  "provider": "gemini-3.5-flash-lite",
  "requestId": "req_bnqb8ao7v",
  "warnings": [],
  "metadata": {
    "originalWordCount": 24,
    "rewrittenWordCount": 19,
    "tone": "conversational",
    "strength": "balanced",
    "audience": "general"
  }
}
```

### Error Responses
- `400 Bad Request`: Payload validation error or text exceeds max word limit.
- `429 Too Many Requests`: Daily limit reached (e.g. 3 requests/day).
- `502 Bad Gateway`: AI provider upstream error.
- `503 Service Unavailable`: Model paused via `MODEL_REQUESTS_ENABLED=false`.

---

## 2. GET `/api/v1/usage`
Retrieves today's usage statistics and remaining quota for the client.

### Headers
- `Authorization: Bearer <token>` (Optional)

### Response (200 OK)
```json
{
  "date": "2026-10-13",
  "dailyLimit": 3,
  "requestsUsed": 1,
  "requestsRemaining": 2,
  "wordsUsed": 24,
  "maxWordsPerRequest": 800
}
```

---

## 3. POST `/api/v1/feedback`
Submits user feedback rating and comments.

### Request Body
```json
{
  "rating": 5,
  "category": "quality",
  "comment": "The conversational rewrite was clean and kept my tone!"
}
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Thank you for your feedback!"
}
```

---

## 4. GET `/api/health`
Health check and system status probe.

### Response (200 OK)
```json
{
  "status": "healthy",
  "modelEnabled": true,
  "timestamp": "2026-10-13T07:20:34.929Z",
  "version": "1.0.0-beta"
}
```
