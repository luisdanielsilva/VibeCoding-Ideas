# VibeCoding Ideas — project notes

A static site: a public log of app concepts. Plain HTML + vanilla JS + CSS, no build step, no backend,
no dependencies. Live at <https://www.singleuseapps.com/vibecodingideas/>.

## Layout — this directory is BOTH the git checkout and the web docroot

`/var/www/vibecodingideas/` is served directly by nginx *and* is the working copy of
`github.com/luisdanielsilva/VibeCoding-Ideas`. That is deliberate (chosen 2026-09-14), but it has two
consequences that matter:

1. **The deploy overwrites this directory.** GitHub Actions rsyncs with `--delete` into this same path,
   so uncommitted local edits are reverted by the next push from anywhere. Always commit before pushing.
   `.git` and `.github` are rsync-excluded and therefore survive deploys.
2. **The nginx dotfile deny rule is load-bearing.** Without it `.git/` is publicly fetchable and the whole
   repo history can be reconstructed by anyone. Never remove it:

   ```nginx
   # in /etc/nginx/sites-available/singleuseapps-com, before location /vibecodingideas/
   location ~ ^/vibecodingideas/\. { return 404; }
   ```

   After any nginx change, verify: `curl -o /dev/null -w "%{http_code}\n" \
   https://www.singleuseapps.com/vibecodingideas/.git/config` must return **404**.

## Deploy

`git push` to `main` → GitHub Actions → Tailscale + rsync into `/var/www/vibecodingideas/` → nginx reload.
See `.github/workflows/deploy.yml`. Secrets: `TAILSCALE_AUTHKEY`, `VPS_HOST`, `VPS_PASSWORD`.

Served as a path on the `www.singleuseapps.com` vhost via `root /var/www` (not `alias`), so
`/vibecodingideas/x` maps to `/var/www/vibecodingideas/x`.

## sudo needs a password

Claude cannot edit nginx configs or write outside this directory. For server changes: stage the new config
(e.g. `~/name.new`), show a diff, and have the user run one line with the `!` prefix — always
`sudo cp <backup> && sudo cp <new> && sudo nginx -t && sudo systemctl reload nginx`, so a bad config is
caught by `nginx -t` before the reload. Alternatively the deploy workflow already runs `sudo -S` over SSH,
so directory creation/chown can be done by editing `deploy.yml` instead.

## ideas.json is the database

One array of idea objects, rendered as cards by `script.js` (`renderIdeas()`), expanded in a modal
(`openModal()`). Schema:

```
id, title, status, excerpt,
features[], stages[], advantages[], pitfalls[],
roadmap[{task, done, complexity?, monetization?}],
timestamp, images[]        # images is optional
```

- `status` is `Concept` | `In Progress` | `Completed` | `Canceled`. It is lowercased and hyphenated into a
  CSS class, so a **new status needs a matching rule in `style.css`**.
- `roadmap` splits automatically: `done: false` → "Features to implement", `done: true` → "Shipped".
- **Descriptions are not in this file.** Each idea's long description is a markdown file at
  `descriptions/<id>.md` (e.g. `descriptions/VC-011.md`), fetched when the modal opens and rendered by
  `renderMarkdown()` in `script.js`. To change a description, edit that file — nothing in `ideas.json`
  needs touching. A new idea needs a matching `.md` file or its modal shows "Description unavailable."
- Cards render in array order, not sorted by id (VC-005 currently sits after VC-007).
- Edit it with a small Python script (`json.load` → mutate → `json.dump(indent=2, ensure_ascii=False)` plus
  a trailing newline) to match the file's existing formatting; do not hand-edit large entries.

## The markdown renderer

`renderMarkdown()` in `script.js` is a ~70-line, dependency-free renderer written for exactly what the
description files use. It is not CommonMark and does not try to be:

- `#` → `<h3>`, `##` → `<h4>`, `###` → `<h5>` — capped so a description never outranks the modal's own
  `<h3>` section headings. The files use `##`.
- `-`/`*` bullets and `1.` numbered lists; an unindented continuation line joins the item above it.
- `**bold**`, `*italic*`, `` `code` ``, `[text](url)` (links get `target="_blank" rel="noopener noreferrer"`).
- `> ` blockquote — styled as an accent-bordered callout, for a lead line or a standout claim.
- `---` on its own line — a horizontal divider between major parts.
- ``` fences — monospace block with whitespace preserved, used for the ASCII flow diagrams.
  Nothing inside a fence is parsed as markdown, and blank lines survive.
- `|` pipe tables, with an optional `|---|---|` second row marking a header. Cells accept inline
  markup; write `\|` for a literal pipe inside a cell (Mermaid edge labels need this).
- Blank line separates blocks. Everything is HTML-escaped first, so markup in a `.md` file renders as
  text rather than executing.
- Emoji are just text and work anywhere; `descriptions/VC-011.md` uses them as section markers.
- No images or nested lists. Add them to the renderer *and* `style.css` before using them.
- Every description follows the same shape: lead callout → problem → an ASCII diagram of how it
  works → feature/stack tables → a numbered build plan → risks → definition of done. They are
  written to be handed to an AI as a build brief, not just read.

Styling lives under `.modal-body .full-description` in `style.css`.

## Unbuilt work

`plans/IMPLEMENTATION_PLAN - VibeCoding Ideas Portal.md` specs two phases that do not exist yet: search +
status filtering on the card grid, and an offline `admin.html` form for composing entries.
