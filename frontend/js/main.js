/* ===================================================================
   THE TYPEWRITER DIARY — main.js
   App bootstrap: loads the initial feed, and wires the "File this
   entry" button to (1) POST the text to the backend, (2) play the
   tear-off animation, and (3) drop the confirmed entry into the feed.
   =================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const fileBtn = document.getElementById('fileEntryBtn');
  const statusEl = document.getElementById('composeStatus');

  Entries.init();

  function setStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.classList.toggle('is-error', isError);
  }

  async function fileEntry() {
    const text = Typewriter.getText();
    if (!text) return;

    fileBtn.disabled = true;
    setStatus('Filing...');

    try {
      const res = await fetch(`${Entries.getApiBase()}/api/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      const data = await res.json();

      if (!res.ok) {
        // Server-side validation/rate-limit rejection — show its message
        // rather than a generic failure, so the rules are transparent.
        setStatus(data.error || 'That entry could not be filed.', true);
        fileBtn.disabled = false;
        return;
      }

      // Play the tear-off animation, then swap the fresh sheet in and
      // drop the confirmed (server-returned) entry into the feed —
      // using the server's version, not the raw client text, since the
      // server is the source of truth (it may trim/normalize it).
      await Typewriter.playFileAnimation();
      Typewriter.clear();
      Entries.prependNew(data.entry);
      setStatus('Filed.');
      setTimeout(() => setStatus(''), 2000);
    } catch (err) {
      console.error('[main] failed to file entry:', err);
      setStatus('Could not reach the diary. Try again in a moment.', true);
    } finally {
      fileBtn.disabled = Typewriter.getText().length === 0;
      Typewriter.focus();
    }
  }

  fileBtn.addEventListener('click', fileEntry);

  // Allow Ctrl/Cmd+Enter from inside the textarea as a quick "file it" shortcut.
  document.getElementById('entryTextarea').addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      fileEntry();
    }
  });
});
