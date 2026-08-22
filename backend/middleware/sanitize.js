/* ===================================================================
   THE TYPEWRITER DIARY — middleware/sanitize.js

   WHY THIS FILE EXISTS (read this if you're learning from the code):
   The frontend already limits the textarea to 700 characters and
   never inserts entry text as HTML (it uses `textContent`, not
   `innerHTML`, in entries.js). But the frontend's rules are only
   suggestions — anyone can call POST /api/entries directly with curl
   or Postman and skip the browser entirely. The SERVER must enforce
   its own rules independently of whatever the client claims. This is
   the single most important lesson in this file: never trust input
   validation that happens only in the browser.
   =================================================================== */

const MAX_CHARS = 700;
const MIN_CHARS = 1;

// A deliberately small, illustrative denylist — NOT a real moderation
// system. A production app would use a proper moderation service or
// a maintained wordlist, and likely a human review queue for edge
// cases. This exists to demonstrate the pattern, not to be robust.
const BLOCKED_PATTERNS = [
  /\b(viagra|crypto\s*giveaway|click\s*here\s*to\s*win)\b/i
];

/**
 * Escapes HTML special characters. IMPORTANT: this is NOT applied to
 * what we store in the database — it's exported for you to use if
 * you ever build a view that renders entries with `innerHTML`.
 *
 * This project's own frontend (entries.js) renders entry text with
 * `element.textContent = entry.text`, and `textContent` NEVER
 * interprets its input as HTML — a value of `<script>...</script>`
 * is displayed as literal text, not executed. That single line is
 * the real XSS defense here. If we escaped the text before storing
 * it (turning `&` into `&amp;`), `textContent` would then display
 * the literal characters "&amp;" instead of "&", which is a
 * confusing, wrong-looking bug — escaping and textContent both
 * "fix" XSS, but only if you pick ONE and stay consistent.
 * Escape-at-render (this project's approach) is usually the safer
 * default; escape-at-storage is for when you don't control every
 * place the data gets rendered later.
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function validateEntry(req, res, next) {
  const { text } = req.body;

  if (typeof text !== 'string') {
    return res.status(400).json({ error: 'Entry text is required.' });
  }

  const trimmed = text.trim();

  if (trimmed.length < MIN_CHARS) {
    return res.status(400).json({ error: 'Entry cannot be empty.' });
  }

  if (trimmed.length > MAX_CHARS) {
    return res.status(400).json({ error: `Entry cannot exceed ${MAX_CHARS} characters.` });
  }

  if (BLOCKED_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return res.status(400).json({ error: 'This entry looks like spam and was not filed.' });
  }

  // Strip control characters (e.g. null bytes) that have no business
  // being in a diary entry and can cause odd behavior downstream.
  // eslint-disable-next-line no-control-regex
  const cleaned = trimmed.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

  // Stored as plain text, unescaped — see the note on escapeHtml()
  // above for why that's the correct choice given how entries.js
  // renders this data on the frontend.
  req.body.text = cleaned;
  next();
}

module.exports = { validateEntry, escapeHtml, MAX_CHARS };
