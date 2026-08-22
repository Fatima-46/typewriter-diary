/* ===================================================================
   THE TYPEWRITER DIARY — server.js
   App entry point. Wires together: SQLite (via better-sqlite3), the
   schema (run once at startup, idempotent thanks to `IF NOT EXISTS`),
   CORS (so the separately-hosted frontend can call this API), and the
   /api/entries routes.

   Run locally with:  npm install && npm start
   =================================================================== */

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const buildEntriesRouter = require('./routes/entries');

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db', 'diary.db');
const SCHEMA_PATH = path.join(__dirname, 'db', 'schema.sql');

// ---- Database setup -------------------------------------------------
// better-sqlite3 creates diary.db on disk automatically the first time
// this runs if it doesn't already exist — no separate "create the
// database" step needed.
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL'); // safer + faster for concurrent reads

const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

// ---- Express app ------------------------------------------------------
const app = express();

// CORS: allow the frontend's origin to call this API. During local
// dev the frontend is usually opened directly as a file or served on
// a different port than the backend, so we keep this permissive here
// — for a real deployment, restrict `origin` to your actual frontend
// URL instead of leaving it wide open.
app.use(cors());
app.use(express.json({ limit: '10kb' })); // small limit: this is a diary, not a file upload

app.use('/api/entries', buildEntriesRouter(db));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// Centralized error handler — catches anything thrown/rejected in a
// route that wasn't already handled, so the client always gets JSON
// back instead of an HTML stack-trace page.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[server] unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong on our end.' });
});

app.listen(PORT, () => {
  console.log(`The Typewriter Diary backend is listening on http://localhost:${PORT}`);
});
