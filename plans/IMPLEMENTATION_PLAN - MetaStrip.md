# IMPLEMENTATION PLAN — VC-007 MetaStrip

**Stack:** React 18 + Vite 5 (frontend) / Express 4 (API) / Electron 29 (desktop)  
**Repo:** `github.com/luisdanielsilva/metastrip` (local: `/Users/luissilva/Documents/MyWorkspace/metastrip/`)  
**Live (web):** `http://100.93.94.115/metastrip/` — PM2 (port 4001) + nginx proxy  
**Auto-deploy:** GitHub Actions on push to `main` → rsync → npm ci → npm run build → PM2 reload → nginx restart

---

## What's Built

### Backend (`server/`)

| Component | File | Status |
|-----------|------|--------|
| Express server, multer upload (100MB, 100 files) | `server/index.js` | ✅ Done |
| `POST /api/read` — metadata inspection | `server/index.js:31` | ✅ Done |
| `POST /api/strip` — selective metadata removal | `server/index.js:51` | ✅ Done |
| Metadata reader (exifr — GPS, EXIF, IPTC, XMP, camera, timestamps, author) | `server/metadata.js:readMetadata()` | ✅ Done |
| Metadata stripper (sharp — strip all or selective) | `server/metadata.js:stripMetadata()` | ✅ Done |
| ICC color profile + orientation always preserved | `server/metadata.js:117` | ✅ Done |
| Static frontend serving from `dist/` | `server/index.js:14` | ✅ Done |

**Formats supported:** JPEG, PNG, TIFF (via sharp)  
**Known limitation:** Selective strip falls back to strip-all because sharp can't write partial EXIF — noted in `server/metadata.js:105`

### Frontend (`src/`)

| Component | File | Status |
|-----------|------|--------|
| App state & orchestration | `src/App.jsx` | ✅ Done |
| Drag & drop upload zone | `src/components/DropZone.jsx` | ✅ Done |
| Metadata viewer (per-file, per-category) | `src/components/MetadataViewer.jsx` | ✅ Done |
| Criteria panel (preset + custom toggles) | `src/components/CriteriaPanel.jsx` | ✅ Done |
| Results panel with download buttons | `src/components/ResultsPanel.jsx` | ✅ Done |
| Preset system: Privacy Mode, Full Clean, Custom | `src/App.jsx:13` | ✅ Done |
| ZIP batch download via JSZip | `src/components/ResultsPanel.jsx` | ✅ Done |
| API client | `src/utils/api.js` | ✅ Done |
| Add more files after initial load | `src/App.jsx:162` | ✅ Done |

### Infrastructure

| Component | File | Status |
|-----------|------|--------|
| Electron shell | `electron/` | ✅ Done |
| PM2 ecosystem config | `ecosystem.config.js` | ✅ Done |
| GitHub Actions deploy pipeline | `.github/workflows/deploy.yml` | ✅ Done |
| nginx location block script | `scripts/add_nginx_location.py` | ✅ Done |

---

## Remaining Work

### Phase 1 — Selective Strip Fix
**Problem:** `stripMetadata()` in `server/metadata.js:105` notes that selective strip falls back to strip-all because sharp can't write partial EXIF back. The UI shows per-category toggles but they don't take effect for selective removal.

**Steps:**
1. Replace selective strip with an ExifTool subprocess approach (same pattern as VisualExif):
   - Install `exiftool-vendored` npm package (bundles ExifTool, no system dependency)
   - When `criteria.all` is false, write the buffer to a temp file, run ExifTool with the appropriate flags, read the output file back as a buffer, delete temp files
   - Flag mapping: `gps → -GPS:All=`, `timestamps → -Time:All=`, `author → -Author= -Artist= -Copyright= -Creator=`, `camera → -Make= -Model= -LensModel= -Software=`
2. Keep the `sharp` path for `criteria.all = true` (simpler and faster)

**Acceptance:** Upload a photo with GPS, camera, and author data → select only GPS → strip → download → verify with exiftool CLI that GPS tags are gone but camera model is present.

---

### Phase 2 — Before/After Metadata Diff View
**Goal:** Show a side-by-side or before/after comparison of what was removed.

**Steps:**
1. In `App.jsx`, store the pre-strip `metaFiles` snapshot when the user clicks "Strip Metadata"
2. After strip completes, the `results` array contains the processed files — re-read their metadata via `/api/read` to get the after-state
3. Add a "Diff" tab alongside the existing "metadata" and "results" tabs
4. In the diff view, render two columns: "Before" (original metadata) and "After" (post-strip metadata), with removed fields highlighted in red

**Acceptance:** Upload GPS-tagged photo → strip GPS → open Diff tab → GPS fields shown in red as removed, camera fields shown as unchanged.

---

### Phase 3 — Metadata Export (CSV / JSON)
**Goal:** Let users download metadata as CSV or JSON before stripping, for archiving purposes.

**Steps:**
1. In `MetadataViewer.jsx`, add "Export CSV" and "Export JSON" buttons
2. On click, serialize the `metaFiles` state from `App.jsx` into the chosen format:
   - JSON: `JSON.stringify(metaFiles, null, 2)` → download as `metadata.json`
   - CSV: flatten each file's metadata categories into rows → download as `metadata.csv`
3. Use the browser's `URL.createObjectURL(new Blob([...]))` pattern (no backend call needed)

**Acceptance:** Upload 3 images → click "Export CSV" → downloaded file has 3 rows with all metadata fields as columns.

---

### Phase 4 — Desktop Distributables

#### 4a. macOS .dmg
**Steps:**
1. Add `electron-builder` config to `package.json` targeting `dmg`
2. Set up code signing: Apple Developer certificate in `APPLE_CERTIFICATE` GitHub secret
3. Add `notarize.js` hook using `@electron/notarize` with Apple ID + app-specific password
4. Add a GitHub Actions job `build-mac` that runs `npm run build && electron-builder --mac`
5. Upload the `.dmg` as a release artifact

#### 4b. Windows .exe (NSIS installer)
**Steps:**
1. Add `electron-builder` target `nsis` to `package.json`
2. Add `build-windows` GitHub Actions job using `windows-latest` runner
3. Code signing optional for initial release (Windows shows SmartScreen warning without it)

#### 4c. Linux .AppImage
**Steps:**
1. Add `electron-builder` target `AppImage` to `package.json`
2. Add `build-linux` GitHub Actions job using `ubuntu-latest` runner

**Acceptance for all:** GitHub Release page has three downloadable artifacts: `MetaStrip-1.x.x.dmg`, `MetaStrip-Setup-1.x.x.exe`, `MetaStrip-1.x.x.AppImage`.

---

### Phase 5 — RAW Format Support
**Problem:** sharp (the image processing library) does not support RAW formats. ExifTool does.

**Steps:**
1. For RAW formats (CR2, CR3, ARW, NEF, DNG, ORF), use `exiftool-vendored` for both read and strip (ExifTool handles these natively)
2. Update `server/index.js` multer `fileFilter` to accept RAW MIME types
3. In `metadata.js`, branch on mimetype: use `exifr` + `sharp` for JPEG/PNG/TIFF, use ExifTool subprocess for RAW
4. Return a base64-encoded stripped RAW file the same way JPEG is returned

**Acceptance:** Upload a `.CR2` file → metadata inspector shows EXIF → strip GPS → download → verify GPS removed via `exiftool` CLI.

---

## Architecture Notes
- The web server and Electron app share the same Express backend — Electron just wraps it in a native window
- `server/metadata.js:stripMetadata()` is the core bottleneck for selective strip accuracy — Phase 1 is the highest-value fix
- The nginx reverse proxy strips the `/metastrip/` prefix before forwarding to Express, so all API calls from the frontend use relative paths (`/api/read`)
- PM2 keeps the Express process alive across reboots; `pm2 save` + `pm2 startup` ensures it survives server restarts

---

## AI Proposed Features

Features ordered by monetization potential. Web server mode is the primary monetization surface.

| # | Feature | Value Proposition | Monetization Model | Complexity |
|---|---------|-------------------|-------------------|------------|
| 1 | **REST API with API Keys** | `POST /api/strip` accessible programmatically — for developers and CI/CD pipelines that need automated metadata removal | SaaS subscription by volume; developer audience pays reliably | Medium |
| 2 | **PDF Metadata Stripping** | Remove author, creation date, software, and custom properties from PDF files | Expands beyond images into a much larger market; legal/HR teams share PDFs constantly | Medium |
| 3 | **Video Metadata Stripping** (MP4, MOV) | Remove GPS, device info, and timestamps from video files | Videos carry even more sensitive metadata than photos; mobile-shot content is the growth area | Medium |
| 4 | **White-Label / Self-Hosted Enterprise License** | Organizations deploy MetaStrip on their own infrastructure under their own branding | One-time enterprise license fee; avoids SaaS pricing objections for large orgs | Low |
| 5 | **GDPR / Compliance Audit Report** | After stripping, generate a signed PDF report: "These X files had their metadata removed on [date] by [user]" | Legal and compliance teams require documentation; premium positioning for enterprise | Medium |
| 6 | **Direct URL Processing** | Paste an image URL → MetaStrip fetches, inspects, and strips it — no manual download required | Removes the biggest friction for web/social media use cases | Low |
| 7 | **Cloud Storage Integration** (Google Drive, Dropbox) | Connect Drive/Dropbox, select files to strip, write cleaned files back — no manual download/upload | Team workflow integration; natural PRO feature for shared drives | High |
| 8 | **Browser Extension** | Right-click any image on the web → "Strip Metadata with MetaStrip" — sends to the API, offers cleaned download | Viral distribution channel; extension drives web app and PRO sign-ups | Medium |
| 9 | **Webhook / Automation Integration** | Configure a URL endpoint: MetaStrip calls it with the cleaned file after every strip job — Zapier/Make compatible | Automation-first teams (marketing agencies, newsrooms) will pay for this | Medium |
| 10 | **User Accounts & Usage Dashboard** | Login, view strip history, download past results, manage API keys, track monthly usage | Foundation for all SaaS billing; enables team plans and per-seat licensing | High |

### Feature Detail

#### F1 — REST API with API Keys
The Express backend already has the two core endpoints. Adding an API layer means:
1. Add a `POST /api/keys` endpoint to generate API keys (UUID v4, stored in a simple JSON file or SQLite)
2. Add `apiKeyAuth` middleware: check `Authorization: Bearer <key>` header on `/api/read` and `/api/strip`
3. Rate limiting per key via `express-rate-limit` with a Redis or in-memory store
4. Free tier: 50 strips/month. PRO: 5000/month. Enterprise: unlimited
5. Return usage in response headers: `X-Quota-Used: 12`, `X-Quota-Remaining: 38`
6. Simple API key management UI page at `/dashboard`

#### F2 — PDF Metadata Stripping
PDF metadata (Author, Creator, Producer, CreationDate, ModDate, custom XMP) is handled differently from images:
1. Add `application/pdf` to multer's `fileFilter` in `server/index.js`
2. Use `pdf-lib` (npm) to read and clear metadata: `pdfDoc.setTitle('')`, `pdfDoc.setAuthor('')`, `pdfDoc.setCreator('')`, `pdfDoc.setProducer('')`, `pdfDoc.setKeywords([])`
3. For XMP metadata embedded in PDFs, use `exiftool-vendored` (handles PDF XMP natively)
4. Return the cleaned PDF buffer as base64, same as images
5. Update the frontend `DropZone` to accept `.pdf` files and show a PDF icon in the results panel

#### F3 — Video Metadata Stripping
MP4/MOV files carry GPS coordinates (from iPhones), device info, and creation timestamps in their `moov` atom:
1. Add `video/mp4` and `video/quicktime` to multer's accepted types
2. Use `exiftool-vendored` to read video metadata (GPS, Make, Model, CreateDate, Software)
3. For stripping: use `ffmpeg` (via `fluent-ffmpeg` npm package) — `ffmpeg -i input.mp4 -map_metadata -1 -c copy output.mp4` strips all metadata without re-encoding
4. `sharp` is image-only — the server needs to branch on MIME type to use ffmpeg for video
5. Update the frontend to accept video files and show a video preview thumbnail

#### F4 — White-Label Enterprise License
No code changes needed for the core app. The deliverable is a license agreement + deployment package:
1. Create a `docker-compose.yml` that spins up MetaStrip (Express + React build) with a configurable `BRAND_NAME` env variable
2. Add a `src/config.js` that reads `VITE_APP_NAME`, `VITE_PRIMARY_COLOR`, `VITE_LOGO_URL` from environment at build time
3. The enterprise customer builds their own Docker image with their branding
4. Provide a setup guide and a one-time license key that unlocks unlimited API calls
5. Price: €499–€2999 one-time per organization

#### F5 — GDPR Compliance Audit Report
1. After a strip job, store a record server-side: `{ jobId, timestamp, fileCount, filenames, strippedCategories, ipHash }`
2. Add `GET /api/report/:jobId` that generates a PDF report using `pdfkit` (npm):
   - Header: MetaStrip logo, date, job ID
   - Table: filename, categories stripped, file size before/after
   - Footer: "This report certifies that metadata was removed in accordance with GDPR Article 5(1)(c)"
3. Sign the PDF with a HMAC of the job record to make it tamper-evident
4. Gate behind PRO: free users see the job summary in the UI only; PRO users can download the signed PDF

#### F6 — Direct URL Processing
1. Add a URL input field in the frontend below the drop zone: "Or paste an image URL"
2. New backend endpoint `POST /api/fetch` — accepts `{ url: string }`:
   - Validate URL (must resolve to an image MIME type)
   - Fetch with `node-fetch` (with a 10 MB size cap and 5s timeout)
   - Pass the buffer through the existing `readMetadata()` pipeline
   - Return the same response format as `/api/read`
3. User can then click "Strip" and the fetched buffer goes through `/api/strip` normally
4. Security: only allow `http://` and `https://` schemes; reject private IP ranges (SSRF protection)

#### F7 — Cloud Storage Integration
1. **Google Drive**: OAuth 2.0 flow (consent screen in a popup) → `GET /drive/v3/files` to list images → download selected file buffers → strip → `POST /drive/v3/files` to upload cleaned version alongside original
2. **Dropbox**: Same pattern via Dropbox API v2
3. UI: new "From Cloud" tab in the drop zone area — shows a file picker for the connected cloud account
4. OAuth tokens stored server-side per session (or per user account once F10 is built)

#### F8 — Browser Extension
1. Build as a Chrome/Firefox extension (Manifest V3)
2. Content script: adds a "Strip Metadata" option to the browser's right-click context menu on images
3. Background service worker: downloads the image, `POST`s it to the MetaStrip API (`/api/strip`), triggers a download of the cleaned file
4. Extension settings page: API key input (links to PRO account), default strip preset selection
5. Publish to Chrome Web Store and Firefox Add-ons — free extension drives web app traffic

#### F9 — Webhook / Automation Integration
1. PRO users configure a webhook URL in their dashboard
2. After each strip job completes, the server makes a `POST` to the webhook URL with:
   ```json
   { "jobId": "...", "timestamp": "...", "files": [{ "name": "...", "url": "..." }] }
   ```
3. Cleaned files are stored temporarily (15 min) on the server and the `url` points to a one-time download link
4. Add Zapier and Make (Integromat) as documented integration targets — no special code needed, they support generic webhooks
5. Use case: Marketing agency uploads images → MetaStrip strips → webhook fires → cleaned images auto-upload to their CMS

#### F10 — User Accounts & Usage Dashboard
This is the foundation that enables all SaaS billing:
1. Auth: email + password with `bcrypt` + JWT, or OAuth via Google (`passport-google-oauth20`)
2. Database: SQLite (simple, file-based, no infra) with `better-sqlite3`
3. Schema: `users`, `api_keys`, `jobs` (strip history), `usage` (monthly counters)
4. Dashboard page (`/dashboard`):
   - Usage chart: strips per day this month
   - Job history: date, file count, categories stripped, download again (if within retention window)
   - API keys: list, create, revoke
   - Subscription status and upgrade button
5. Billing: integrate Stripe Checkout (`stripe` npm) — redirect to hosted payment page, webhook updates `users.plan`
