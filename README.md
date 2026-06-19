# GBC Coaching Instrument

**Gap · Bottleneck · Cliff** — Inward2Onward LLC coaching instrument v1

A structured pre-session instrument that helps coaching clients collapse choices before a decision is made. No accounts. No client content stored server-side. Ever.

---

## File Inventory

```
/
├── client.html          Client three-touchpoint experience
├── admin.html           EJ admin: code generator + session dashboard
├── functions/
│   └── api.js           Cloudflare Pages Function: all server-side logic
├── gbc-schema.sql       Supabase table definitions (reference — already applied)
├── wrangler.jsonc       Cloudflare Pages configuration
└── README.md            This file
```

---

## Stack

| Layer | Platform |
|---|---|
| Static hosting | Cloudflare Pages — `gbc.inward2onward.com` |
| Server logic | Cloudflare Pages Function — `functions/api.js` |
| Database | Supabase — project `joopdhoxkjexqrygusom` |

No npm dependencies. No build step. Everything is plain HTML and vanilla JS.

---

## Deploy Instructions (EJ — Owner Actions)

### Step 1: Connect repo to Cloudflare Pages

1. Log in to Cloudflare dashboard
2. Go to **Pages** > **Create a project** > **Connect to Git**
3. Select the `I2IMAGES/gbc-coaching-instrument` repository
4. Set these build settings:
   - **Build command:** (leave blank — no build step)
   - **Build output directory:** `.` (root)
5. Click **Save and Deploy**

### Step 2: Set secrets (Cloudflare Pages dashboard)

Go to your Pages project > **Settings** > **Environment variables** > **Add variable** (mark each as Secret):

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://joopdhoxkjexqrygusom.supabase.co` |
| `SUPABASE_ANON_KEY` | *(get from Supabase dashboard > Project Settings > API)* |
| `ADMIN_PASSWORD` | *(choose a strong password — this is what you type on admin.html)* |

**ADMIN_PASSWORD is never committed to this repo. Set it only in the Cloudflare dashboard.**

Alternatively, set via CLI:
```bash
npx wrangler pages secret put SUPABASE_URL
npx wrangler pages secret put SUPABASE_ANON_KEY
npx wrangler pages secret put ADMIN_PASSWORD
```

### Step 3: Set custom domain

1. In Cloudflare Pages > **Custom domains** > **Set up a custom domain**
2. Enter `gbc.inward2onward.com`
3. Cloudflare will configure DNS automatically if the domain is on the same account

### Step 4: Verify deployment

After deploy:

1. Open `https://gbc.inward2onward.com/admin.html`
2. Enter your admin password
3. Click **Generate code** — a code like `GBC-0619-47` should appear and the URL copies to clipboard
4. Open `https://gbc.inward2onward.com?code=GBC-0619-47` (use the actual code)
5. Verify all three questions load and T1 fires immediately
6. Click through all three questions and commit a test direction
7. Return to admin, click **Refresh** — all four dots (T1, T2, T3, committed) should be green/indigo
8. Inspect `gbc_touches` table in Supabase — confirm no answer text is present

---

## How It Works

### Client flow

1. EJ generates a session code and pastes the URL into his message to the client
2. Client opens the URL on any device — no account, no login
3. Three questions appear in sequence: **The Gap**, **The Bottleneck**, **The Cliff**
4. Answers save to localStorage only — never transmitted
5. Client names their direction (commit), clicks **I commit to this.**
6. Confirmation screen appears with a Calendly link for follow-up booking

### What is stored server-side

Only these fields — nothing else, ever:

| Field | Where |
|---|---|
| `session_code` | `gbc_sessions`, `gbc_touches` |
| `touchpoint` | `gbc_touches` (enum: T1_opened, T2_opened, T3_opened, T3_committed) |
| `committed` | `gbc_touches` (boolean) |
| `created_at` | both tables |

Answer text never leaves the client's browser.

### Session code format

`GBC-MMDD-NN` — month, day, two-digit random suffix. Example: `GBC-0619-47`

---

## Security Notes

- `admin.html` is not linked from any public page (`noindex, nofollow` meta tag set)
- `ADMIN_PASSWORD` is a Cloudflare secret — never stored in any committed file
- CORS is not needed since client.html, admin.html, and `/api` are all same-origin
- RLS is disabled on GBC tables per ADR-001 (v1). The Pages Function is the only consumer of the anon key, server-side. Flag before enabling public client access.
- Supabase anon key is safe to use server-side in the Pages Function (it is a secret binding, not exposed to the browser)

---

## Supabase Reference

- **Project:** joopdhoxkjexqrygusom (BridgeBuilder)
- **Region:** us-east-1
- **Tables:** `gbc_sessions`, `gbc_touches`
- **Schema applied:** 2026-06-19

---

## Calendly Link

`https://calendly.com/ej--33/ai-powered-workflows-automation`

Update in `client.html` if this changes.

---

## Contact

EJ Steele — ej@inward2onward.com — 623.272.8066 — Glendale, AZ
