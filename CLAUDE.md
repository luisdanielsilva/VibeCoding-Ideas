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
id, title, status, excerpt, full_description,
features[], stages[], advantages[], pitfalls[],
roadmap[{task, done, complexity?, monetization?}],
timestamp, images[]        # images is optional
```

- `status` is `Concept` | `In Progress` | `Completed` | `Canceled`. It is lowercased and hyphenated into a
  CSS class, so a **new status needs a matching rule in `style.css`**.
- `roadmap` splits automatically: `done: false` → "Features to implement", `done: true` → "Shipped".
- `full_description` renders with `white-space: pre-line`, so `\n\n` gives real paragraph breaks.
- Cards render in array order, not sorted by id (VC-005 currently sits after VC-007).
- Edit it with a small Python script (`json.load` → mutate → `json.dump(indent=2, ensure_ascii=False)` plus
  a trailing newline) to match the file's existing formatting; do not hand-edit large entries.

## Unbuilt work

`plans/IMPLEMENTATION_PLAN - VibeCoding Ideas Portal.md` specs two phases that do not exist yet: search +
status filtering on the card grid, and an offline `admin.html` form for composing entries.
