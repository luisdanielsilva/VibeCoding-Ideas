# VibeCoding Ideas 💡✨

A minimal, subtle portal to document and roadmap app ideas.

## 🚀 Repository Structure
- `index.html`: Minimal landing page.
- `style.css`: Clean, subtle dark-themed styles.
- `script.js`: Dynamic idea loading logic.
- `ideas.json`: The database of ideas (JSON format).
- `deploy_ftp.py`: Deployment script to push changes to the server.

## 🛠️ How to Add an Idea
1. Open `ideas.json`.
2. Add a new entry following the existing schema:
   ```json
   {
       "title": "Your App Name",
       "status": "Concept | In Progress | Completed",
       "excerpt": "Short summary for the list view.",
       "full_description": "Detailed explanation of the idea.",
       "timestamp": "YYYY-MM-DD",
       "implementation_plan": "# Plan\n1. Step one..."
   }
   ```
3. Save and run `python3 deploy_ftp.py` to update the site.

## 🌐 Deployment
The site is configured to be deployed to the `/htdocs/ideas` folder on your server.
