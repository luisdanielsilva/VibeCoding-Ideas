# IMPLEMENTATION PLAN — VC-002 VibeCoding Ideas Portal

**Stack:** Static HTML + vanilla JS + CSS  
**Live:** `http://100.93.94.115/vibecoding/`  
**Repo:** `VibeCoding-Ideas/` in the scratch workspace  
**Deploy:** Push to git → GitHub Actions → rsync to VPS (nginx static file serving)

---

## What's Built

| Component | File | Status |
|-----------|------|--------|
| Card grid rendering | `script.js:renderIdeas()` | ✅ Done |
| Modal detail view | `script.js:openModal()` | ✅ Done |
| Roadmap checklist in modal | `script.js` (roadmap section) | ✅ Done |
| Image lightbox | `script.js` (lightbox block) | ✅ Done |
| Glassmorphism design system | `style.css` | ✅ Done |
| JSON data source | `ideas.json` | ✅ Done |
| FTP/rsync auto-deploy | `deploy_ftp.py` + GitHub Actions | ✅ Done |

---

## Remaining Work

### Phase 1 — Search & Filtering
**Goal:** User can filter the card grid without a page reload.

**Steps:**
1. Add a search bar input above the card grid in `index.html`
2. Add status filter buttons (All / Concept / In Progress / Completed / Canceled)
3. In `script.js`, after `renderIdeas()` runs, attach an `input` listener on the search bar that:
   - Lowercases the query and matches against `idea.title`, `idea.excerpt`, `idea.id`
   - Filters the in-memory `ideas` array and re-calls `renderIdeas(filtered)`
4. Attach `click` listeners on filter buttons that filter by `idea.status`
5. Combine both filters (AND logic: active status filter + search query)

**Acceptance:** Typing "meta" shows only MetaStrip card. Clicking "Concept" shows only VC-003 and VC-004.

---

### Phase 2 — Offline Admin Draft Screen
**Goal:** A local-only HTML page to compose new idea entries as JSON without hand-editing `ideas.json`.

**Steps:**
1. Create `admin.html` in the repo root (not deployed to VPS — add to rsync `--exclude`)
2. Build a form with fields matching the `ideas.json` schema:
   - Text inputs: `id`, `title`, `status` (dropdown), `excerpt`, `full_description`, `timestamp`
   - Repeatable list inputs for: `features`, `stages`, `advantages`, `pitfalls`
   - Roadmap items: task text + done checkbox, with add/remove row buttons
3. On submit, serialize form state to a JSON object and display it in a `<textarea>` for copy-paste into `ideas.json`
4. Optionally add a "Preview" button that renders the entry using the same `openModal()` logic from `script.js`

**Acceptance:** Fill the form → click Generate → copy the JSON block → paste into `ideas.json` → portal renders correctly.

---

## Notes
- `ideas.json` is the single source of truth. No backend required.
- Status badge colors are driven by CSS class `idea.status.toLowerCase().replace(' ', '-')` — new statuses need a matching CSS rule.
- The admin screen should never be synced to the VPS (sensitive internal tool).
