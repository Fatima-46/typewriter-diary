/* ===================================================================
   THE TYPEWRITER DIARY — middleware/rateLimiter.js

   Stops one visitor from flooding the diary with dozens of entries a
   minute. Uses `express-rate-limit`, which tracks request counts
   per IP address in memory.

   TRADEOFFS TO UNDERSTAND (this is the honest part):
   - In-memory tracking resets whenever the server restarts, and
     doesn't work correctly if you ever run more than one server
     instance (each instance has its own counter). A production app
     would use a shared store like Redis instead.
   - IP-based limiting is easy to bypass: anyone behind a mobile
     carrier's shared IP, a VPN, or a botnet can get a fresh IP
     trivially. It stops casual/accidental spam, not a determined
     attacker.
   - We're also NOT storing any IP alongside entries themselves (see
     schema.sql) — the rate limiter only holds IPs in short-lived
     memory to count requests, it never writes them to the database.
     That keeps the "genuinely anonymous" promise intact while still
     getting basic abuse protection.
   =================================================================== */

const rateLimit = require('express-rate-limit');

const postEntryLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,                   // 5 new entries per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many entries filed recently. Please wait a few minutes and try again.' }
});

module.exports = { postEntryLimiter };
