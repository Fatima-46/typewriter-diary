<div align="center">

<svg width="100%" height="160" viewBox="0 0 900 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The Typewriter Diary banner">
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3b2a20"/>
      <stop offset="45%" stop-color="#6b4a2f"/>
      <stop offset="100%" stop-color="#c98a3e"/>
    </linearGradient>
    <linearGradient id="strip" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#e8c07a"/>
      <stop offset="100%" stop-color="#f4e3c1"/>
    </linearGradient>
  </defs>

  <rect width="900" height="160" rx="18" fill="url(#paper)"/>

  <!-- stacked "paper sheets" peeking from behind -->
  <rect x="60" y="112" width="780" height="14" rx="4" fill="#f4e3c1" opacity="0.35"/>
  <rect x="45" y="120" width="810" height="14" rx="4" fill="#f4e3c1" opacity="0.25"/>

  <!-- typed-line strip -->
  <rect x="60" y="52" width="780" height="6" fill="url(#strip)" opacity="0.8"/>

  <text x="450" y="90" font-family="Georgia, 'Courier New', serif" font-size="46" font-weight="700" fill="#fdf3e0" text-anchor="middle" letter-spacing="2">
    The Typewriter Diary
  </text>
</svg>

</div>

# The Typewriter Diary

A shared, anonymous public journal styled like an old typewriter sitting on a
stack of antique paper. Anyone can type a thought and "file" it as a dated
entry that everyone else can scroll through.

- **Frontend**: plain HTML + CSS + Bootstrap 5 + vanilla JS (no framework, no build step)
- **Backend**: Node.js + Express + SQLite (via `better-sqlite3`)

---

## 1. Project structure

```
typewriter-diary/
├── frontend/            → static site, open directly or serve with any static host
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── assets/
└── backend/              → Express API + SQLite database
    ├── server.js
    ├── db/
    ├── routes/
    └── middleware/
```

## 2. Running it locally

### Backend

```bash
cd backend
npm install
npm start
```

This starts the API on `http://localhost:3000`. On first run it creates
`backend/db/diary.db` automatically (SQLite is just a file — no separate
database server to install).

Check it's alive: open `http://localhost:3000/health` — you should see
`{"status":"ok"}`.

### Frontend

The frontend is static, so any local server works. Simplest option:

```bash
cd frontend
python3 -m http.server 8081
```

Then open `http://localhost:8081` in your browser. **Do not just double-click
`index.html`** — browsers block `fetch()` requests from `file://` pages, so
the diary feed won't load unless it's served over `http://`.

By default `frontend/js/entries.js` points at `http://localhost:3000` for the
API. If you change the backend's port, update `API_BASE` at the top of that
file.

## 3. How the "signature moment" works

Typing in the compose textarea gives a small mechanical "thud" feel on every
keystroke (`typewriter.js`, `.is-keypress` in `animations.css`). Clicking
**File this entry**:

1. Plays a short tear-off animation on the current paper sheet (`tearAndFile`
   keyframes) — the sheet lifts, tilts, and drops away
2. Sends the text to the backend (`POST /api/entries`)
3. Once the backend confirms it, a fresh blank sheet fades into the
   typewriter and the confirmed entry (using the server's stored version, not
   just what you typed) settles into the top of the feed below

The animation is purely visual and happens client-side; the actual POST
request runs in parallel and the entry is only added to the feed once the
server confirms it succeeded. If the server rejects it (too long, empty,
rate-limited), the animation doesn't run and you see the reason instead.

## 4. Security notes — read this, it's the point

This is a **public, anonymous, write-enabled** form, which is one of the
riskier things you can put on the internet. Here's what's implemented, why,
and what's deliberately left out.

### What's implemented

**Server-side validation (`backend/middleware/sanitize.js`)**
The frontend limits the textarea to 700 characters, but that's just a UX
nicety — anyone can call the API directly with `curl` and skip the browser
entirely. The server re-checks length and non-emptiness independently. This
is the single most important lesson in the whole project: **never trust
validation that only happens in the browser.**

**XSS defense via `textContent`, not escaping-on-write**
Entry text is stored exactly as typed (after trimming/cleaning control
characters). The frontend (`entries.js`) renders it with:
```js
element.textContent = entry.text;
```
`textContent` never interprets its input as HTML — a value like
`<script>alert(1)</script>` is displayed as those literal characters, not
executed. Try it: post an entry containing a `<script>` tag and watch it show
up as plain text in the feed. That's the actual defense here, and it's why
the entry text is stored *raw* rather than HTML-escaped — escaping on write
would make `textContent` display literal `&amp;` instead of `&`, which is a
wrong-looking bug. `escapeHtml()` is still exported from `sanitize.js` with a
comment explaining when you *would* want it (e.g. if you ever render entries
with `innerHTML` somewhere else).

**Rate limiting (`backend/middleware/rateLimiter.js`)**
5 new entries per IP per 10-minute window, via `express-rate-limit`. Tradeoffs
worth knowing:
- It's in-memory, so it resets on server restart and doesn't work correctly
  across multiple server instances (a real production setup would use Redis)
- IP-based limiting is easy to route around (VPN, mobile carrier NAT, etc.) —
  it stops casual spam, not a determined attacker

**Basic spam/profanity filtering**
A tiny illustrative regex denylist in `sanitize.js`. This is explicitly NOT a
real moderation system — a production app would use a maintained wordlist or
moderation service, and likely a human review queue for edge cases.

**Minimal data collection**
`schema.sql` stores only `text` and `created_at` — no IP address, no session
ID, nothing else, anywhere. The rate limiter tracks IPs in short-lived memory
to count requests, but never writes them to the database. That's what keeps
"anonymous" actually true rather than just "no login screen."

### What's NOT fully defended against (be honest about this in interviews!)

- **CSRF**: there's no CSRF token on the POST endpoint. It's lower-risk here
  because there's no session/cookie-based auth to hijack — but a real app
  with authenticated actions would need this.
- **Determined spam/abuse**: the rate limiter and profanity filter are basic.
  A motivated attacker with rotating IPs could still flood the diary.
- **Content moderation at scale**: there's no reporting/removal mechanism.
  A real public board would need one.

## 5. Concepts worth reviewing to fully understand this code

- Express routing and middleware chains (`app.use`, route-level middleware order)
- SQL basics: `CREATE TABLE`, `INSERT`, parameterized queries (`?` placeholders —
  note these prevent SQL injection, which is why raw string concatenation
  into SQL is never used anywhere in `routes/entries.js`)
- What XSS actually is and the difference between `textContent` and `innerHTML`
- CSS custom properties (`--page-tilt`) and `nth-child` selectors, used for the
  page-stack tilt effect
- CSS `@keyframes` and `animationend` events (used to sequence the tear-off animation with the JS that follows it)
- `localStorage` is NOT used here on purpose — entries are shared publicly via
  the backend, not stored per-browser

## 6. Deploying it

**Frontend** (static): GitHub Pages, Netlify, or Vercel all work well and are
free. Just point them at the `frontend/` folder.

**Backend**: Render or Railway both have free tiers that work for a small
Node + SQLite app like this.
- Set the **root directory** to `backend/`
- Build command: `npm install`
- Start command: `npm start`
- SQLite's `diary.db` file lives on disk — on most free tiers this disk is
  *not* persistent across redeploys, so entries may reset when you redeploy.
  For a portfolio project that's usually fine; if you want entries to survive
  redeploys, look into your host's persistent disk add-on, or swap SQLite for
  a hosted Postgres free tier later.

**Connecting them**: after deploying the backend, copy its live URL (e.g.
`https://typewriter-diary-api.onrender.com`) into `API_BASE` at the top of
`frontend/js/entries.js`, then redeploy the frontend. Also consider locking
down CORS in `backend/server.js` (currently `app.use(cors())` allows any
origin) to just your frontend's domain once you know it.

## 7. Swapping in real sound effects

`frontend/assets/sounds/key-tap.mp3` and `stamp.mp3` are currently silent
placeholder files (just so the site doesn't error before you've added real
audio). Replace them with short royalty-free clips — a few hundred
milliseconds is plenty for both — from a source like Freesound or Pixabay
Audio, keeping the same filenames.

## 8. Extending moderation later

Ideas if you want to take this further:
- Swap the regex denylist for a maintained profanity-filter package or an
  external moderation API
- Add a lightweight "report" button per entry that flags it for review
  (would need a new `flagged` column and an admin-only endpoint)
- Move rate limiting to a shared store (Redis) if you ever run more than one
  backend instance
