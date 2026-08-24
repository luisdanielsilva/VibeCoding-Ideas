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

This repository uses **GitHub Actions** to automatically sync changes to the VPS over Tailscale + rsync (see `.github/workflows/deploy.yml`). Every `git push` to `main` deploys to `/var/www/singleuseapps-portal/vibecodingideas/`, served at `luisdanielsilva.com/vibecodingideas/`.

Required repository secrets: `TAILSCALE_AUTHKEY`, `VPS_HOST`, `VPS_PASSWORD`.
