/* ===================================================================
   THE TYPEWRITER DIARY — routes/entries.js
   Two routes only:
     GET  /api/entries?page=1&limit=10   -> paginated, newest first
     POST /api/entries { text }          -> files a new entry

   Uses `better-sqlite3`, which is SYNCHRONOUS — no callbacks or
   promises for queries. That's a deliberate teaching choice: for a
   small app like this, synchronous queries are easier to read
   top-to-bottom, and better-sqlite3 is fast enough that it doesn't
   block the event loop in any way that matters at this scale.
   =================================================================== */

const express = require('express');
const { validateEntry } = require('../middleware/sanitize');
const { postEntryLimiter } = require('../middleware/rateLimiter');

function buildEntriesRouter(db) {
  const router = express.Router();

  // GET /api/entries?page=1&limit=10
  router.get('/', (req, res) => {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const offset = (page - 1) * limit;

    const totalRow = db.prepare('SELECT COUNT(*) AS count FROM entries').get();
    const totalPages = Math.max(1, Math.ceil(totalRow.count / limit));

    const entries = db
      .prepare('SELECT id, text, created_at FROM entries ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?')
      .all(limit, offset);

    res.json({ entries, page, totalPages, total: totalRow.count });
  });

  // POST /api/entries  { text: "..." }
  // validateEntry runs first (400s on bad input), then the rate
  // limiter (429 if this IP has posted too many recently), then the
  // actual insert only runs if both passed.
  router.post('/', validateEntry, postEntryLimiter, (req, res) => {
    const { text } = req.body;

    const result = db
      .prepare('INSERT INTO entries (text) VALUES (?)')
      .run(text);

    const entry = db
      .prepare('SELECT id, text, created_at FROM entries WHERE id = ?')
      .get(result.lastInsertRowid);

    res.status(201).json({ entry });
  });

  return router;
}

module.exports = buildEntriesRouter;
