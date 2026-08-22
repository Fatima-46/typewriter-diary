[![The Typewriter Diary banner](https://capsule-render.vercel.app/api?type=waving&color=0:2B1E16,40:6B4A2F,100:C98A3E&height=200&section=header&text=The%20Typewriter%20Diary&fontSize=48&fontColor=F4E3C1&animation=fadeIn&fontAlignY=38&desc=Type%20a%20thought.%20File%20it.%20Watch%20it%20stack%20up.&descAlignY=58&descSize=15&descColor=E8C07A)](#-running-it-locally)

![Node.js](https://img.shields.io/badge/Node.js-2B1E16?style=for-the-badge&logo=nodedotjs&logoColor=E8C07A)
![Express](https://img.shields.io/badge/Express-6B4A2F?style=for-the-badge&logo=express&logoColor=F4E3C1)
![SQLite](https://img.shields.io/badge/SQLite-C98A3E?style=for-the-badge&logo=sqlite&logoColor=2B1E16)
![Vanilla JS](https://img.shields.io/badge/Vanilla%20JS-6B4A2F?style=for-the-badge&logo=javascript&logoColor=F4E3C1)
![Bootstrap 5](https://img.shields.io/badge/Bootstrap%205-C98A3E?style=for-the-badge&logo=bootstrap&logoColor=2B1E16)

![No Framework](https://img.shields.io/badge/No%20Build%20Step-F4E3C1?style=flat-square&labelColor=2B1E16)
![Status](https://img.shields.io/badge/Status-Active-F4E3C1?style=flat-square&labelColor=6B4A2F)
![License](https://img.shields.io/badge/License-MIT-F4E3C1?style=flat-square&labelColor=C98A3E)

### 📔 A shared, anonymous public journal

Styled like an old typewriter sitting on a stack of antique paper. Anyone can
type a thought and **"file"** it as a dated entry that everyone else can
scroll through — no login, no accounts, no names attached.

<!-- Replace the # below with your live deployment URL once hosted -->
[![Try it live](https://capsule-render.vercel.app/api?type=rounded&color=0:6B4A2F,100:2B1E16&height=80&section=header&text=TRY%20IT%20LIVE&fontSize=28&fontColor=F4E3C1&animation=twinkling&fontAlignY=62&width=420)](#)
<!-- Replace Gul/typewriter-diary below with your actual GitHub path -->
![Source](https://img.shields.io/badge/📦%20Source-typewriter--diary-2B1E16?style=for-the-badge&labelColor=C98A3E)

## 📌 Table of Contents

|                                                          |                                                          |
| -------------------------------------------------------- | -------------------------------------------------------- |
| 📁 [Project Structure](#-project-structure)               | 🔐 [Security Notes](#-security-notes--read-this-its-the-point) |
| ▶️ [Running It Locally](#️-running-it-locally)             | 📚 [Concepts to Review](#-concepts-worth-reviewing-to-fully-understand-this-code) |
| ✍️ [How It Works](#️-how-the-signature-moment-works)       | 🚀 [Deploying It](#-deploying-it)                          |
| 🎨 [Design System](#-design-system)                        | 🔊 [Sound Effects](#-swapping-in-real-sound-effects)       |
|                                                            | 🧭 [Extending It](#-extending-moderation-later)            |

---

- **Frontend**: plain HTML + CSS + Bootstrap 5 + vanilla JS (no framework, no build step)
- **Backend**: Node.js + Express + SQLite (via `better-sqlite3`)

## 📁 Project Structure

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

## ▶️ Running It Locally

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

Then open `http://localhost:8081` in your browser.

> [!WARNING]
> Do not just double-click `index.html`. Browsers block `fetch()` requests from `file://` pages, so the diary feed won't load unless it's served over `http://`.

By default `frontend/js/entries.js` points at `http://localhost:3000` for the
API. If you change the backend's port, update `API_BASE` at the top of that
file.

## ✍️ How the "Signature Moment" Works

Typing in the compose textarea gives a small mechanical "thud" feel on every
keystroke (`typewriter.js`, `.is-keypress` in `animations.css`). Clicking
**File this entry**:

| Step | What happens |
|---|---|
| 1 | Plays a short tear-off animation on the current paper sheet (`tearAndFile` keyframes) — the sheet lifts, tilts, and drops away |
| 2 | Sends the text to the backend (`POST /api/entries`) |
| 3 | Once the backend confirms it, a fresh blank sheet fades in and the confirmed entry (the server's stored version, not just what you typed) settles into the top of the feed |

The animation is purely visual and happens client-side; the actual POST
request runs in parallel and the entry is only added to the feed once the
server confirms it succeeded. If the server rejects it (too long, empty,
rate-limited), the animation doesn't run and you see the reason instead.

## 🔐 Security Notes — Read This, It's the Point

> [!IMPORTANT]
> This is a **public, anonymous, write-enabled** form, which is one of the riskier things you can put on the internet. Here's what's implemented, why, and what's deliberately left out.

### What's Implemented

<details>
<summary><b>Server-side validation</b> (<code>backend/middleware/sanitize.js</code>)</summary>
<br/>

The frontend limits the textarea to 700 characters, but that's just a UX
nicety — anyone can call the API directly with `curl` and skip the browser
entirely. The server re-checks length and non-emptiness independently.

> [!TIP]
> This is the single most important lesson in the whole project: **never trust validation that only happens in the browser.**

</details>

<details>
<summary><b>XSS defense via <code>textContent</code></b>, not escaping-on-write</summary>
<br/>

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

</details>

<details>
<summary><b>Rate limiting</b> (<code>backend/middleware/rateLimiter.js</code>)</summary>
<br/>

5 new entries per IP per 10-minute window, via `express-rate-limit`. Tradeoffs
worth knowing:
- It's in-memory, so it resets on server restart and doesn't work correctly
  across multiple server instances (a real production setup would use Redis)
- IP-based limiting is easy to route around (VPN, mobile carrier NAT, etc.) —
  it stops casual spam, not a determined attacker

</details>

<details>
<summary><b>Basic spam/profanity filtering</b></summary>
<br/>

A tiny illustrative regex denylist in `sanitize.js`. This is explicitly NOT a
real moderation system — a production app would use a maintained wordlist or
moderation service, and likely a human review queue for edge cases.

</details>

<details>
<summary><b>Minimal data collection</b></summary>
<br/>

`schema.sql` stores only `text` and `created_at` — no IP address, no session
ID, nothing else, anywhere. The rate limiter tracks IPs in short-lived memory
to count requests, but never writes them to the database. That's what keeps
"anonymous" actually true rather than just "no login screen."

</details>

### What's NOT Fully Defended Against (Be Honest About This in Interviews!)

> [!CAUTION]
> - **CSRF**: there's no CSRF token on the POST endpoint. It's lower-risk here because there's no session/cookie-based auth to hijack — but a real app with authenticated actions would need this.
> - **Determined spam/abuse**: the rate limiter and profanity filter are basic. A motivated attacker with rotating IPs could still flood the diary.
> - **Content moderation at scale**: there's no reporting/removal mechanism. A real public board would need one.

## 📚 Concepts Worth Reviewing to Fully Understand This Code

| Concept | Where it shows up |
|---|---|
| Express routing & middleware chains | `app.use`, route-level middleware order |
| SQL basics | `CREATE TABLE`, `INSERT`, parameterized `?` queries (prevents SQL injection) |
| XSS fundamentals | `textContent` vs `innerHTML` |
| CSS custom properties & `nth-child` | `--page-tilt`, page-stack effect |
| CSS `@keyframes` & `animationend` | sequencing the tear-off animation with JS |
| `localStorage` (deliberately unused) | entries are shared publicly via the backend, not per-browser |

## 🚀 Deploying It

| Layer | Where | Notes |
|---|---|---|
| Frontend (static) | GitHub Pages, Netlify, or Vercel | point at the `frontend/` folder |
| Backend | Render or Railway | free tier is enough for Node + SQLite |

Backend setup:
- Set the **root directory** to `backend/`
- Build command: `npm install`
- Start command: `npm start`

> [!NOTE]
> SQLite's `diary.db` file lives on disk — on most free tiers this disk is *not* persistent across redeploys, so entries may reset when you redeploy. For a portfolio project that's usually fine; if you want entries to survive redeploys, look into your host's persistent disk add-on, or swap SQLite for a hosted Postgres free tier later.

**Connecting them**: after deploying the backend, copy its live URL (e.g.
`https://typewriter-diary-api.onrender.com`) into `API_BASE` at the top of
`frontend/js/entries.js`, then redeploy the frontend. Also consider locking
down CORS in `backend/server.js` (currently `app.use(cors())` allows any
origin) to just your frontend's domain once you know it.

## 🎨 Design System

The whole project — site and this README — runs on one five-shade parchment
palette:

| ![#F4E3C1](https://placehold.co/60x60/F4E3C1/F4E3C1.png) | ![#E8C07A](https://placehold.co/60x60/E8C07A/E8C07A.png) | ![#C98A3E](https://placehold.co/60x60/C98A3E/C98A3E.png) | ![#6B4A2F](https://placehold.co/60x60/6B4A2F/6B4A2F.png) | ![#2B1E16](https://placehold.co/60x60/2B1E16/2B1E16.png) |
|:---:|:---:|:---:|:---:|:---:|
| `Parchment`<br/>`#F4E3C1` | `Aged Paper`<br/>`#E8C07A` | `Ink Ribbon`<br/>`#C98A3E` | `Walnut`<br/>`#6B4A2F` | `Espresso`<br/>`#2B1E16` |
| page background | card surfaces | accent / links | body ink | headings & type strip |

## 🔊 Swapping in Real Sound Effects

`frontend/assets/sounds/key-tap.mp3` and `stamp.mp3` are currently silent
placeholder files (just so the site doesn't error before you've added real
audio). Replace them with short royalty-free clips — a few hundred
milliseconds is plenty for both — from a source like Freesound or Pixabay
Audio, keeping the same filenames.

## 🧭 Extending Moderation Later

Ideas if you want to take this further:
- Swap the regex denylist for a maintained profanity-filter package or an
  external moderation API
- Add a lightweight "report" button per entry that flags it for review
  (would need a new `flagged` column and an admin-only endpoint)
- Move rate limiting to a shared store (Redis) if you ever run more than one
  backend instance

## 📄 License

Released under the [MIT License](./LICENSE).

---

`#CyberSecurity` `#NodeJS` `#Express` `#SQLite` `#VanillaJS` `#XSSPrevention` `#PortfolioProject`

[![footer banner](https://capsule-render.vercel.app/api?type=waving&color=0:2B1E16,60:6B4A2F,100:C98A3E&height=100&section=footer)](#-the-typewriter-diary)
