# IMPLEMENTATION PLAN — VC-001 FileLister

**Stack:** Native macOS — Swift / SwiftUI + CryptoKit  
**Repo:** `FileLister/` in the scratch workspace (Xcode project)  
**Version:** v1.2.0 (deployed, cryptographic license system active)  
**Distribution:** Direct — paid license via email-bound cryptographic key  
**Trial:** 15 free deletions before license required

---

## What's Built

### Core Engine (`FileScanner.swift`)

| Component | Status |
|-----------|--------|
| Recursive directory enumerator | ✅ Done |
| Fast scan: name + size matching (`FileScanner:performScan()`) | ✅ Done |
| Deep scan: SHA-256 cryptographic verification (`FileScanner:performDeepAnalysis()`) | ✅ Done |
| Safety lock: binary identity check before any deletion (`FileScanner:recycleFile()`) | ✅ Done |
| Single-file recycle to Trash (`NSWorkspace.recycle`) | ✅ Done |
| Batch delete with safety verification (`FileScanner:recycleAllDuplicates()`) | ✅ Done |
| Auto-selection rules: Keep Oldest / Newest / Largest (`AutoSelectRule`) | ✅ Done |
| Sorting: by name, size, duplicate count | ✅ Done |
| Filters: media only, skip hidden files, file extension filter | ✅ Done |
| Action logging to timestamped `.txt` file | ✅ Done |
| Storage savings tracker (potential + recovered) | ✅ Done |
| Cloud file (on-demand) graceful fallback in SHA-256 (`calculateSHA256` catch block) | ✅ Done |

### UI (`ContentView.swift`)

| Component | Status |
|-----------|--------|
| Folder picker (`NSOpenPanel`) | ✅ Done |
| Duplicate groups list with file icons | ✅ Done |
| Per-file ignore checkbox | ✅ Done |
| Quick Look preview (Space bar shortcut) | ✅ Done |
| Open in Finder button per file | ✅ Done |
| Dual progress bar (scan + SHA-256 per-file) | ✅ Done |
| Status bar with savings, recovery, trial counter | ✅ Done |
| Batch delete confirmation alert | ✅ Done |
| Trial-gate on batch delete and single delete | ✅ Done |

### License System (`LicenseManager.swift`)

| Component | Status |
|-----------|--------|
| Email-bound SHA-256 key validation (6-char signature) | ✅ Done |
| UserDefaults persistence of registration state | ✅ Done |
| Trial counter (15 free deletions) | ✅ Done |
| Deactivation / reset | ✅ Done |

---

## Known Issues / Technical Debt

### TDT-001 — Registration URL Placeholder
`ContentView.swift:443` — the "Register here" button opens `https://www.google.com`. This must be updated to the actual purchase/registration URL before any public distribution.

**Fix:** Replace `URL(string: "https://www.google.com")` with the real store/purchase page URL.

### TDT-002 — Cloud On-Demand File Handling
When SHA-256 hashing fails (file is iCloud/OneDrive on-demand — not locally present), `calculateSHA256()` returns `nil` and the file is treated as unique (`"failed_<uuid>"`). This prevents false deletions but also means cloud-only duplicates are silently skipped.

**Fix (monitoring):** Log skipped cloud files separately in the action log so the user knows they exist. Potentially surface them in the UI with a cloud icon and "Not downloaded" label.

---

## Remaining Work

### Phase 1 — OneDrive Integration via Microsoft Graph API

**Goal:** Scan OneDrive cloud storage for duplicates without requiring files to be fully synced to local disk. Cross-reference with local scan results for a unified deduplication report.

This is a significant feature involving OAuth, a REST API client, and UI changes. Break it into 5 steps:

#### Step 1 — Microsoft Entra App Registration
*One-time setup, done outside Xcode.*

1. Go to [portal.azure.com](https://portal.azure.com) → Azure Active Directory → App Registrations → New Registration
2. Name: "FileLister", Supported account types: "Personal Microsoft accounts only"
3. Redirect URI: `msauth.com.yourteam.FileLister://auth` (custom URL scheme)
4. Under API Permissions, add: `Files.Read` (Microsoft Graph, Delegated)
5. Note the **Application (client) ID** — store it as a constant in a new `OneDriveConfig.swift` file
6. No client secret needed — use PKCE (public client flow)

#### Step 2 — OAuth 2.0 / PKCE Device Auth Flow
*New file: `OneDriveAuthManager.swift`*

Use the **Device Code Flow** (user-friendly for desktop apps — no web view needed):
1. `POST https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode` with `client_id` + `scope=Files.Read offline_access`
2. Present the `user_code` and `verification_uri` to the user in a sheet: "Visit microsoft.com/devicelogin and enter code XXXX-XXXX"
3. Poll `POST /oauth2/v2.0/token` every 5 seconds until the user completes login (authorization_pending → success)
4. Store `access_token` and `refresh_token` in Keychain (`SecItemAdd`)
5. Implement token refresh: before each API call, check expiry and refresh if needed

#### Step 3 — Graph API File Crawler
*New file: `OneDriveScanner.swift`*

1. `GET https://graph.microsoft.com/v1.0/me/drive/root/delta` — pages through all files in OneDrive
2. Parse each `DriveItem`: extract `name`, `size`, `id`, `parentReference.path`, `file.hashes.sha256Hash` (Graph provides SHA-256 natively — no download needed)
3. Store results as `[OneDriveFileInfo]`: `{ id, name, size, path, sha256 }`
4. Handle pagination: follow `@odata.nextLink` until `@odata.deltaLink` is returned
5. Publish progress to `@Published var cloudScanProgress: Double` for the UI

#### Step 4 — Unified Duplicate Report
*Changes to `FileScanner.swift` and `ContentView.swift`*

1. After both local scan and cloud scan complete, merge results:
   - Match local files to cloud files by SHA-256 hash (requires local deep scan to be enabled)
   - Also detect cloud-only duplicates (same SHA-256 appearing in multiple OneDrive paths)
2. Extend `DuplicateGroup` with a `source: DuplicateSource` enum: `.local`, `.cloud`, `.crossCloud`
3. Update the duplicate list UI to show a cloud badge next to OneDrive files
4. For cross-source duplicates (same file locally and in OneDrive): show both paths, let user decide which to keep
5. Deleting a cloud duplicate: `DELETE https://graph.microsoft.com/v1.0/me/drive/items/{id}` (moves to OneDrive Recycle Bin)

#### Step 5 — UI Integration
*Changes to `ContentView.swift`*

1. Add a toolbar toggle: "Include OneDrive" (disabled if not authenticated)
2. Add an "OneDrive" button that triggers sign-in sheet (shows device code)
3. Show a cloud scan progress bar alongside the local scan bar
4. Add "Sign Out" option in the license/settings sheet

**Acceptance:** User signs in to OneDrive → scans local folder + OneDrive → sees a merged list of duplicate groups with cloud files clearly labelled → can delete cloud-only duplicates from within the app.

---

### Phase 2 — SHA-256 Edge Case Monitoring (TDT-002)

**Goal:** Surface skipped cloud-only files instead of silently ignoring them.

**Steps:**
1. In `performDeepAnalysis()`, track files where `calculateSHA256()` returns `nil` separately from confirmed duplicates
2. Add a `skippedCloudFiles: [DuplicateFileInfo]` published property to `FileScanner`
3. In the UI, show a collapsible "Skipped (not downloaded)" section below the duplicate list if `skippedCloudFiles` is non-empty
4. Each skipped entry shows the file path and a note: "File not available locally — sign in to OneDrive to scan"

---

## Notes
- The SHA-256 salt in `LicenseManager.swift:61` encodes "FileLister-Secret-Salt-2026-Porto" — do not change this or existing licenses will invalidate
- The Keychain is the correct store for OneDrive tokens; do not use UserDefaults for OAuth tokens
- OneDrive's Graph API returns `sha256Hash` only for files that have been uploaded/processed; freshly uploaded files may not have it yet — handle the `null` case gracefully
- The Device Code Flow was chosen over a WebView because it requires no redirect URI handling and avoids embedding a browser in the app

---

## AI Proposed Features

Features ordered by monetization potential. All are PRO-tier unless marked otherwise.

| # | Feature | Value Proposition | Monetization Model | Complexity |
|---|---------|-------------------|-------------------|------------|
| 1 | **Similar Image Detection** (perceptual hashing) | Finds near-duplicate photos that differ by crop, resize, or compression — byte comparison misses these entirely | Core PRO upsell — photographers and photo hoarders will pay for this | High |
| 2 | **Storage Analytics Dashboard** | Breakdown of disk usage by file type, top 50 largest files, oldest untouched files, duplicate waste map | Standalone value even without deletion — great first screen after scan | Medium |
| 3 | **Google Drive Integration** | Scan Google Drive for duplicates without syncing locally, same pattern as OneDrive via Drive API v3 | Expands addressable market to Google Workspace users; natural PRO add-on | High |
| 4 | **Scheduled Auto-Scans + Notifications** | User sets a weekly/monthly scan on a watched folder; FileLister runs silently and sends a macOS notification when new duplicates are found | Subscription angle: "Always-on duplicate watch" tier | Medium |
| 5 | **Scan Report Export (PDF / CSV)** | Export the full duplicate report with file paths, sizes, and potential savings — useful for IT admins managing shared drives | B2B appeal: sysadmins need audit trails; justifies team/business license | Low |
| 6 | **Finder Extension (Quick Action)** | Right-click any folder in Finder → "Find Duplicates with FileLister" — launches a pre-scoped scan | Dramatically lowers activation friction; increases word-of-mouth | Medium |
| 7 | **iCloud Drive Integration** | Scan iCloud Drive including on-demand (not yet downloaded) files using CloudKit or FileManager iCloud APIs | Natural for macOS users; differentiates from generic duplicate finders | High |
| 8 | **Dropbox Integration** | Scan Dropbox via Dropbox API v2 — same OAuth + file listing pattern as OneDrive/Google Drive | Third major cloud platform; completes the cloud trifecta | High |
| 9 | **Duplicate Music / Audio Fingerprinting** | Detect duplicate audio files by acoustic fingerprint (via AcoustID / Chromaprint) even if filename, bitrate, or tags differ | Premium niche: music collectors; justifies a higher price point | High |
| 10 | **Smart Exclusion Rules** | User defines rules: "never touch files in ~/Documents/Tax", "ignore files smaller than 1 MB", saved as named presets | Power-user quality-of-life; reduces support requests about accidental deletions | Low |

### Feature Detail

#### F1 — Similar Image Detection (Perceptual Hashing)
Current SHA-256 only finds byte-identical duplicates. Photos exported at different quality settings, screenshots taken twice, or images re-saved with different compression are missed entirely.

**Implementation:**
1. Integrate `vImage` (part of Accelerate framework — no external dependency) to decode images to raw pixel buffers
2. Compute a Difference Hash (dHash): resize to 9×8 grayscale, compare adjacent pixels, produce a 64-bit hash
3. Group files where Hamming distance between hashes is ≤ 10 (configurable threshold)
4. Surface as a separate "Similar Images" tab alongside the exact duplicates list
5. Show a side-by-side thumbnail comparison before the user decides which to keep

#### F2 — Storage Analytics Dashboard
After a scan, show a second tab: "Analytics" with:
- Pie/bar chart of disk usage by file type (using `Charts` framework — available since macOS 13)
- Top 50 largest files list with one-click path reveal in Finder
- "Oldest untouched" files (last accessed > 2 years ago via `URLResourceKey.contentAccessDateKey`)
- Duplicate waste summary: "X GB wasted across Y groups"

#### F3 — Google Drive Integration
Pattern mirrors OneDrive:
1. Google OAuth 2.0 via `AppAuth` library or manual PKCE flow
2. `GET https://www.googleapis.com/drive/v3/files?fields=id,name,size,md5Checksum` — Google Drive returns MD5 natively
3. Cross-reference local SHA-256 vs cloud MD5 (convert or use name+size as secondary signal)
4. Delete via `DELETE https://www.googleapis.com/drive/v3/files/{id}` (moves to Drive Trash)

#### F4 — Scheduled Auto-Scans
1. Register a `BGProcessingTaskRequest` (Background Tasks framework) with `requiresNetworkConnectivity: false`
2. Store user's watched folders and schedule preference in UserDefaults
3. On task fire, run `FileScanner.startScan()` headlessly, collect results
4. Post a `UNUserNotificationCenter` notification: "FileLister found 14 new duplicates in ~/Downloads (2.3 GB)"
5. Tapping the notification opens the app pre-loaded with that scan result

#### F5 — Scan Report Export
1. After scan completes, enable an "Export Report" toolbar button
2. Serialize `scanner.duplicateGroups` into a structured format:
   - **CSV**: one row per file — group ID, filename, path, size, status (kept/deleted)
   - **PDF**: use `NSPrintOperation` or `PDFDocument` — paginated table with summary header
3. Trigger `NSSavePanel` for output path

#### F6 — Finder Extension
1. Create a new Xcode target: "Finder Sync Extension"
2. Register watched folders via `FIFinderSyncController.default().directoryURLs`
3. Add a toolbar button and context menu item: "Find Duplicates"
4. On trigger, use XPC to communicate with the main app (or open it via URL scheme if not running)

#### F7 — iCloud Drive Integration
1. Use `FileManager.default.url(forUbiquityContainerIdentifier:)` to access iCloud container
2. For on-demand files (not downloaded), trigger download via `FileManager.startDownloadingUbiquitousItem(at:)` before hashing — or use metadata-only matching (name + size) as a fast pre-filter
3. Surface iCloud files with a cloud icon, show download progress per file during deep scan

#### F8 — Dropbox Integration
1. OAuth 2.0 PKCE via Dropbox API v2
2. `POST https://api.dropboxapi.com/2/files/list_folder` → paginate with `list_folder/continue`
3. Each entry includes `content_hash` (Dropbox's own rolling hash — not SHA-256; use name+size for cross-source matching instead)
4. Delete: `POST https://api.dropboxapi.com/2/files/delete_v2`

#### F9 — Audio Fingerprinting
1. Bundle the `fpcalc` binary from Chromaprint (open source, MIT license) alongside ExifTool-style
2. For each audio file, run `fpcalc -length 120 <file>` to get a fingerprint
3. Group files where fingerprints are identical (exact duplicate recordings) or use AcoustID API for song identification
4. Surface as a "Duplicate Music" tab — show track name, duration, bitrate side by side

#### F10 — Smart Exclusion Rules
1. New `ExclusionRule` struct: `{ type: .path | .extension | .sizeBelow | .namePattern, value: String }`
2. Rules UI: a list in Preferences with add/remove/edit — same pattern as macOS Mail rules
3. Persist as `[ExclusionRule]` in UserDefaults (JSON encoded)
4. Apply rules in `performScan()` before adding files to the tracker — O(1) per file with a compiled Set for extensions/paths
