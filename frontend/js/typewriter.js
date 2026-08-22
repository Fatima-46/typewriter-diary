/* ===================================================================
   THE TYPEWRITER DIARY — typewriter.js
   Everything about the compose area itself: the live character
   counter, a small "key press" feel on each keystroke, and the
   signature tear-off animation that plays when an entry is filed.
   This module does NOT talk to the backend — main.js owns that and
   calls Typewriter.fileCurrentEntry() to get the text + trigger
   the animation together.
   =================================================================== */

const Typewriter = (() => {
  const MAX_CHARS = 700;
  const NEAR_LIMIT = 0.9; // show the counter as "getting close" past 90%

  const textarea = document.getElementById('entryTextarea');
  const well = document.getElementById('paperSheetWell');
  const sheet = document.getElementById('paperSheet');
  const counterEl = document.getElementById('charCounter');
  const fileBtn = document.getElementById('fileEntryBtn');

  // Placeholder audio — see README for swapping these for real
  // key-tap/stamp sounds. Silent by default so the site works
  // out of the box without needing real audio files first.
  const keyTapSfx = new Audio('assets/sounds/key-tap.mp3');
  const stampSfx = new Audio('assets/sounds/stamp.mp3');
  keyTapSfx.volume = 0.35;
  stampSfx.volume = 0.5;

  let keypressTimeout = null;

  function updateCounter() {
    const len = textarea.value.length;
    counterEl.textContent = `${len} / ${MAX_CHARS}`;
    counterEl.classList.toggle('is-near-limit', len >= MAX_CHARS * NEAR_LIMIT);
    fileBtn.disabled = len === 0;
  }

  // Small mechanical "thud" feel on the paper each keystroke — cheap
  // to do with a CSS class toggle rather than JS-driven transforms.
  function pulseKeypress() {
    well.classList.add('is-keypress');
    clearTimeout(keypressTimeout);
    keypressTimeout = setTimeout(() => well.classList.remove('is-keypress'), 90);
    try {
      keyTapSfx.currentTime = 0;
      keyTapSfx.play().catch(() => { /* autoplay guard until first interaction — non-fatal */ });
    } catch (err) { /* missing/placeholder audio file — non-fatal */ }
  }

  textarea.addEventListener('input', () => {
    // Enforce the limit server-side too (see backend/middleware/sanitize.js) —
    // this client-side truncation is only for a responsive typing feel.
    if (textarea.value.length > MAX_CHARS) {
      textarea.value = textarea.value.slice(0, MAX_CHARS);
    }
    updateCounter();
  });

  textarea.addEventListener('keydown', (e) => {
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') {
      pulseKeypress();
    }
  });

  updateCounter();

  return {
    getMaxChars: () => MAX_CHARS,

    getText: () => textarea.value.trim(),

    clear() {
      textarea.value = '';
      updateCounter();
    },

    focus() {
      textarea.focus();
    },

    /**
     * Plays the tear-off animation on the current sheet, then swaps in
     * a fresh blank one. Returns a Promise that resolves once the old
     * sheet has visually left, so main.js can time the "new page lands
     * in the feed" moment to match.
     */
    playFileAnimation() {
      return new Promise((resolve) => {
        try {
          stampSfx.currentTime = 0;
          stampSfx.play().catch(() => { /* non-fatal */ });
        } catch (err) { /* non-fatal */ }
        sheet.classList.add('is-filing');
        sheet.addEventListener(
          'animationend',
          () => {
            sheet.classList.remove('is-filing');
            sheet.classList.add('is-fresh');
            setTimeout(() => sheet.classList.remove('is-fresh'), 400);
            resolve();
          },
          { once: true }
        );
      });
    }
  };
})();
