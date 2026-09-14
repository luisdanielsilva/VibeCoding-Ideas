# VibeCoding Ideas 💡✨

A minimal, subtle portal to document and roadmap app ideas.

## 🚀 Repository Structure
- `index.html`: Minimal landing page.
- `style.css`: Clean, subtle dark-themed styles.
- `script.js`: Dynamic idea loading logic.
- `ideas.json`: The database of ideas (JSON format).
- `.github/workflows/deploy.yml`: GitHub Action to auto-deploy to your server.

## 🛠️ How to Add an Idea

1. Open `ideas.json`.
2. Add a new entry following the existing schema.
3. Commit and push: `git push`. The site will update automatically.

## 🌐 Automated Deployment

This repository uses **GitHub Actions** to automatically sync changes to the VPS over Tailscale + rsync (see `.github/workflows/deploy.yml`). Every `git push` to `main` deploys to `/var/www/vibecodingideas/`.

**Live:** <https://www.singleuseapps.com/vibecodingideas/>

Required repository secrets: `TAILSCALE_AUTHKEY`, `VPS_HOST`, `VPS_PASSWORD`.

### Server layout

The site is its own website with its own docroot at `/var/www/vibecodingideas/`, independent of any
other site on the box. The deploy workflow creates and owns that directory (`deploy:www-data`); the git
checkout lives elsewhere and is never served, so `.git` is not exposed.

It is served as a path on `www.singleuseapps.com` by a `location` block in
`/etc/nginx/sites-available/singleuseapps-com`:

```nginx
location = /vibecodingideas {
    return 301 /vibecodingideas/;
}

location /vibecodingideas/ {
    root /var/www;          # not alias: /vibecodingideas/x -> /var/www/vibecodingideas/x
    index index.html;
    try_files $uri $uri/ =404;
}
```

> Previously served from `/var/www/singleuseapps-portal/vibecodingideas/` at
> `luisdanielsilva.com/vibecodingideas/`. That vhost was retired on 2026-09-04 when the domain moved to
> the `luisdanielsilva-com` config, which left the site unreachable until it was moved here.
