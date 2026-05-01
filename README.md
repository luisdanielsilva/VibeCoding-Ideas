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

This repository uses **GitHub Actions** to automatically sync changes to your web server via FTP. 

### Setup Required:
To make this work, go to your GitHub Repository **Settings > Secrets and variables > Actions** and add the following **Repository secrets**:

1. `FTP_SERVER`: `ftpupload.net`
2. `FTP_USERNAME`: `if0_41673076`
3. `FTP_PASSWORD`: (Your vPanel password)

Once these are set, every `git push` to the `master` branch will trigger a deployment to your `/htdocs/ideas` folder.
