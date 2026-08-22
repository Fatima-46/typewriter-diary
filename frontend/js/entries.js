/* ===================================================================
   THE TYPEWRITER DIARY — entries.js
   Talks to the backend's /api/entries endpoint and renders the diary
   feed. Pure fetch + DOM rendering — no compose-area logic here
   (that's typewriter.js), no wiring of the submit button (that's
   main.js).

   CONFIG: change API_BASE to wherever backend/server.js ends up
   deployed (e.g. 'https://your-backend.onrender.com'). Left as
   localhost for local development.
   =================================================================== */

const Entries = (() => {
  const API_BASE = 'http://localhost:3000';
  const PAGE_SIZE = 10;

  const feedEl = document.getElementById('diaryFeed');
  const emptyMsgEl = document.getElementById('emptyFeedMsg');
  const loadMoreBtn = document.getElementById('loadMoreBtn');

  let currentPage = 1;
  let totalPages = 1;

  // Vintage-style date formatting, e.g. "August 22, 2026" — uses the
  // REAL date/time of the entry, just formatted to feel diary-like.
  function formatDate(isoString) {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  // Assigns the ink-stain/coffee-ring classes to a deliberate subset
  // of pages (roughly every 3rd/5th one) rather than every page, so
  // the marks read as "this one has been sitting here a while."
  function ringClassesFor(indexInFeed) {
    const classes = [];
    if (indexInFeed % 5 === 2) classes.push('has-ring');
    if (indexInFeed % 4 === 0 && indexInFeed !== 0) classes.push('has-ring-soft');
    return classes;
  }

  function pageMarkup(entry, indexInFeed, { animate } = {}) {
    const page = document.createElement('article');
    const rings = ringClassesFor(indexInFeed);
    page.className = ['diary-page', ...rings, animate ? 'is-loaded' : ''].join(' ').trim();
    page.innerHTML = `
      <p class="entry-date">${formatDate(entry.created_at)}</p>
      <p class="entry-text"></p>
    `;
    // Set text via textContent (never innerHTML) so anything a visitor
    // typed can never be interpreted as HTML/JS in the browser — the
    // frontend's own line of defense against XSS, alongside the
    // server-side escaping in backend/middleware/sanitize.js.
    page.querySelector('.entry-text').textContent = entry.text;
    return page;
  }

  function renderPage(entries, { prepend = false, animateNew = false } = {}) {
    emptyMsgEl.style.display = entries.length ? 'none' : 'block';
    entries.forEach((entry, i) => {
      const el = pageMarkup(entry, i, { animate: !prepend });
      if (prepend) {
        el.classList.add('is-new');
        feedEl.insertBefore(el, feedEl.firstChild);
      } else {
        feedEl.appendChild(el);
      }
    });
  }

  async function fetchPage(page) {
    const res = await fetch(`${API_BASE}/api/entries?page=${page}&limit=${PAGE_SIZE}`);
    if (!res.ok) throw new Error(`Failed to load entries (${res.status})`);
    return res.json(); // { entries, page, totalPages }
  }

  return {
    /** Initial load: fetch page 1 and render it. */
    async init() {
      try {
        const data = await fetchPage(1);
        currentPage = data.page;
        totalPages = data.totalPages;
        renderPage(data.entries);
        loadMoreBtn.style.display = currentPage < totalPages ? 'inline-block' : 'none';
      } catch (err) {
        console.error('[entries] initial load failed:', err);
        emptyMsgEl.textContent = 'Could not reach the diary right now. Try again shortly.';
        emptyMsgEl.style.display = 'block';
      }
    },

    /** "Turn to older pages" — fetches and appends the next page. */
    async loadMore() {
      if (currentPage >= totalPages) return;
      loadMoreBtn.disabled = true;
      loadMoreBtn.textContent = 'Turning the page...';
      try {
        const data = await fetchPage(currentPage + 1);
        currentPage = data.page;
        totalPages = data.totalPages;
        renderPage(data.entries);
      } catch (err) {
        console.error('[entries] load more failed:', err);
      } finally {
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'Turn to older pages';
        loadMoreBtn.style.display = currentPage < totalPages ? 'inline-block' : 'none';
      }
    },

    /** Called by main.js right after a successful POST, to show the
     * new entry at the top of the feed immediately without a refetch. */
    prependNew(entry) {
      renderPage([entry], { prepend: true });
    },

    getApiBase: () => API_BASE
  };
})();

document.getElementById('loadMoreBtn').addEventListener('click', () => Entries.loadMore());
