# IMPLEMENTATION PLAN — VC-006 VisualExif

**Stack:** Native macOS — Swift / SwiftUI + bundled ExifTool v13.57  
**Repo:** `VisualExif/` in the scratch workspace (Xcode project)  
**Distribution:** Single Use Apps collection — Free tier + €9.99 PRO one-time license  
**Target:** macOS 13+ (Ventura and later)

---

## What's Built

| Component | File | Status |
|-----------|------|--------|
| Drag & drop file/folder UI | `ContentView.swift` — `DropZoneView` | ✅ Done |
| File list with sidebar selection | `ContentView.swift` — `List` block | ✅ Done |
| Metadata inspector panel | `MetadataInspectorView.swift` | ✅ Done |
| Tag category selector | `TagSelectorView.swift` | ✅ Done |
| ExifTool subprocess wrapper | `ExifToolWrapper.swift` | ✅ Done |
| Folder recursive scanner | `FolderScanner.swift` | ✅ Done |
| Metadata exporter (CSV/JSON stub) | `MetadataExporter.swift` | ✅ Done |
| Batch processing with progress bar | `ContentView.swift` — `startCleaning()` | ✅ Done |
| ExifTool v13.57 bundled + notarized | `Dist/VisualExif.app/Contents/Resources/ExifTool/` | ✅ Done |
| Free + PRO license system | (from ideas.json description) | ✅ Done |

**Supported formats (current):** JPG, JPEG, PNG, HEIC, HEIF, TIFF, TIF, MOV, MP4, M4V, CR2, CR3, ARW, NEF, DNG, ORF, RW2, RAF  
*(Icon mapping exists in `ContentView.swift:iconName()` for all these extensions)*

---

## Remaining Work

### Phase 1 — Free Tier Feature Completion

#### 1a. Remove All Metadata — one-click (Free)
The current flow requires the user to select tag categories in `TagSelectorView` before cleaning. The free tier needs a single "Remove Everything" shortcut.

**Steps:**
1. Add a "Remove All" button above the tag selector in `ContentView.swift`
2. On tap, set `selectedCategories` to all available categories and call `startCleaning()`
3. Gate the PRO category checkboxes behind a license check — keep "Remove All" available to free users

**Acceptance:** Free user with no license can drop a JPG and click "Remove All" → ExifTool strips all tags → inspector shows empty metadata.

#### 1b. Remove GPS Only (Free)
A dedicated quick-action that strips only GPS without touching other metadata.

**Steps:**
1. Add a "Remove GPS" quick-action button (below or alongside "Remove All")
2. On tap, set `selectedCategories = [.gps]` and call `startCleaning()`
3. Confirm `.gps` maps to ExifTool's `-GPS:All=` flag in `ExifToolWrapper.swift`

**Acceptance:** Drop a geotagged photo → click "Remove GPS" → inspector shows no latitude/longitude → other EXIF (camera model, timestamp) unchanged.

#### 1c. Validate & Document Core Format Support
The icon mapping already covers JPG, PNG, HEIC, TIFF, MOV, MP4. Verify ExifTool handles each:

**Steps:**
1. Test each format: JPG, PNG, HEIC, TIFF, MOV, MP4 — inspect and clean one sample file per format
2. If any format fails silently, add an error state to `ContentView.swift` (already has `completionMessage`)
3. Update the app's `fileImporter` and drop zone accepted types to match exactly what's supported

---

### Phase 2 — PRO Tier Features

#### 2a. Metadata Export — CSV / JSON (PRO)
`MetadataExporter.swift` exists but its implementation status is unknown.

**Steps:**
1. Read `MetadataExporter.swift` to confirm what's implemented
2. Wire an "Export" button into `ContentView.swift` toolbar, gated behind PRO license check
3. On tap, serialize `inspectorEntries` to CSV or JSON and trigger a save panel (`NSSavePanel`)

**Acceptance:** Select a file → click Export → save dialog appears → saved CSV has one row per metadata tag.

#### 2b. Before / After Metadata Comparison View (PRO)
Show what metadata was present before cleaning vs. what remains after.

**Steps:**
1. In `startCleaning()`, snapshot `inspectorEntries` before processing into a `beforeEntries` state variable
2. After cleaning completes, re-run `inspectFile()` to get `afterEntries`
3. Add a comparison view (split list or diff-style highlight) showing removed tags in red, retained tags in gray
4. Gate behind PRO license

#### 2c. Preset Profiles (PRO)
Named presets: "Social Media Safe" (strip GPS + author), "Press Release" (strip GPS + camera fingerprint), etc.

**Steps:**
1. Define a `Preset` struct: `{ name: String, categories: Set<ExifCategory> }`
2. Add a preset picker (menu or segmented control) above `TagSelectorView`
3. On selection, update `selectedCategories` to the preset's category set
4. Gate preset picker behind PRO license; free users see only "Custom"

#### 2d. Watch Folder — Auto-clean New Files (PRO)
Monitor a folder with `DispatchSource.makeFileSystemObjectSource` and auto-process new files on arrival.

**Steps:**
1. Add a "Watch Folder" toggle in the toolbar (PRO gated)
2. Use `FSEventStreamCreate` or `DispatchSource` to monitor the selected directory
3. On new file detection, append to `filesToProcess` and trigger `startCleaning()` silently
4. Show a notification via `UNUserNotificationCenter` when files are cleaned

#### 2e. RAW Format Support (PRO)
CR2, CR3, ARW, NEF, ORF, DNG — ExifTool supports these natively.

**Steps:**
1. Add RAW extensions to the accepted drop types and `fileImporter` content types
2. Verify ExifTool commands work for each RAW format (read + strip test)
3. Update `iconName()` (already maps these extensions to `camera.aperture` icon)
4. Gate RAW processing behind PRO license

#### 2f. Date Fixer (PRO)
Sync filesystem modification date with `DateTimeOriginal` EXIF tag.

**Steps:**
1. After cleaning, read `DateTimeOriginal` from the processed file via ExifTool
2. Call `FileManager.setAttributes([.modificationDate: captureDate], ofItemAtPath:)` on the output file
3. Surface as an optional toggle in the UI: "Fix file dates after cleaning"

#### 2g. Operation History & Undo (PRO)
Keep backed-up originals and allow reverting a cleaning operation.

**Steps:**
1. Before any clean operation, copy original to `~/.VisualExif/Backups/<timestamp>/<filename>`
2. Maintain a `[CleanOperation]` log in UserDefaults or a local SQLite db
3. Add a History panel listing past operations with "Restore Original" per file

---

## Notes
- ExifTool is invoked as a subprocess via `ExifToolWrapper.swift` — all format support is a function of the bundled ExifTool version (v13.57)
- PRO license verification logic already exists — new PRO features just need to check the license gate before enabling
- `FolderScanner.swift` handles recursive directory traversal; it's reusable for the Watch Folder feature
- Always process in-place on the original file (ExifTool default) — backups are opt-in via the History feature

---

## AI Proposed Features

Features ordered by monetization potential. All are PRO-tier unless marked as Free.

| # | Feature | Value Proposition | Monetization Model | Complexity |
|---|---------|-------------------|-------------------|------------|
| 1 | **GPS Map View** | Show a pin on an embedded map for any geotagged photo — visualize exactly what location data is exposed before removing it | High-impact PRO demo: seeing your home address on a map before sharing is viscerally convincing | Medium |
| 2 | **Metadata Editor** (write EXIF) | Edit any metadata field in-place — change author, copyright, caption, correct timestamps | Transforms app from cleaner → full metadata manager; opens journalism/photographer market | High |
| 3 | **Privacy Risk Scanner** | AI-powered scan of a folder that flags photos with high-risk metadata (GPS, device serial, face recognition tags) and assigns a risk score | "Audit" use case — organizations, lawyers, journalists; premium positioning | Medium |
| 4 | **Quick Share with Auto-Strip** | macOS Share Sheet integration — share a photo directly from VisualExif after automatically stripping selected categories | Frictionless daily driver for privacy-conscious users; embedded in macOS workflow | Medium |
| 5 | **Metadata Search & Filter** | Search across a folder: "show all photos taken with iPhone 14", "all files with GPS data", "photos taken in 2019" | Power-user PRO feature; unique in the metadata tool market | Medium |
| 6 | **Duplicate Photo Detection** (perceptual hash) | Find visually similar photos in a folder using dHash — same photo saved multiple times at different resolutions | Complements the cleaner workflow; natural PRO bundle with FileLister | High |
| 7 | **Bulk Rename by Metadata** | Rename files using EXIF tokens: `{Date}_{Camera}_{GPSCity}.jpg` → `2024-06-15_Canon_Porto.jpg` | High utility for photographers organizing shoots; widely requested feature in this space | Medium |
| 8 | **iCloud Photos Library Integration** | Browse and clean metadata directly from the iCloud Photos library without needing to export first | Removes the biggest friction point for iPhone users; differentiating feature | High |
| 9 | **Metadata Comparison Across Files** | Select multiple files and compare their metadata side-by-side in a table — quickly spot which files have GPS and which don't | Editorial/team use case: photo editors reviewing batches before publication | Medium |
| 10 | **Copyright & Watermark Stamper** | After stripping, optionally embed new copyright and author metadata, or add a visible watermark to the image | Serves the "strip competitor metadata, add your own" workflow; photographer community | Medium |

### Feature Detail

#### F1 — GPS Map View
1. Add a "Map" tab in the metadata inspector panel (shown only when GPS data is present)
2. Use `MapKit` (`MKMapView` or the newer SwiftUI `Map`) — zero external dependency, already in macOS SDK
3. Place an `MKPointAnnotation` at the GPS coordinates
4. Show coordinates, altitude, and an "Open in Maps" button below the map view
5. Add a prominent "Remove GPS" button directly in the map tab — the visual impact drives conversion to PRO

#### F2 — Metadata Editor
ExifTool supports writing arbitrary EXIF tags (not just removing them):
1. Add an "Edit" mode toggle in `MetadataInspectorView` — fields become editable text inputs
2. On save, run ExifTool with write flags: `exiftool -Artist="New Name" -Copyright="2026" <file>`
3. Support the most common writable fields: Artist, Copyright, ImageDescription, DateTimeOriginal, GPS coordinates
4. Validate inputs (date format, GPS coordinate range) before writing
5. Gate full edit mode behind PRO; allow editing of one field per session in trial

#### F3 — Privacy Risk Scanner
1. Define a risk scoring system:
   - GPS present → +3 points
   - Device serial number (MakerNote tags) → +2 points
   - Author/creator name → +2 points
   - Face region metadata (XMP `mwg-rs:RegionList`) → +3 points
   - Software version (identifies device OS) → +1 point
2. Run via ExifTool with `-json` output across an entire folder
3. Display results as a sorted list: High Risk / Medium Risk / Low Risk / Clean
4. "Fix All High Risk" one-click button: strip GPS + device identifiers from all flagged files

#### F4 — Quick Share with Auto-Strip
1. Implement `NSSharingServicePicker` triggered from a toolbar "Share" button
2. Before passing the file to the sharing service, run the selected strip preset on a temp copy
3. The temp file is shared; the original is untouched
4. Show a confirmation sheet: "Sharing will remove GPS and Author. Original is unchanged."
5. Configurable default strip preset per sharing service (e.g. always remove GPS when sharing to social)

#### F5 — Metadata Search & Filter
1. Add a search bar above the file list in `ContentView`
2. On a folder scan (via `FolderScanner`), read metadata from all files into an in-memory index
3. Support filter expressions:
   - Camera make/model: `camera:iPhone`
   - Date range: `date:2024`
   - GPS present: `has:gps`
   - Missing fields: `missing:author`
4. Results update the file list in real time as the user types
5. Add a "Strip All Matching" button — applies the current preset to all files in the filtered result

#### F6 — Duplicate Photo Detection
1. For each image in a scanned folder, decode to a small grayscale thumbnail via `vImage`
2. Compute a dHash (64-bit perceptual hash): 9×8 pixel grid, compare adjacent columns
3. Group files with Hamming distance ≤ 8 — these are visually near-identical
4. Show duplicate groups in a new "Duplicates" tab with side-by-side thumbnails
5. Let user pick which copy to keep; delete others via `FileManager.trashItem()`

#### F7 — Bulk Rename by Metadata
1. Add a "Rename" action in the toolbar (PRO gated)
2. Provide a rename template field with token autocomplete: `{Year}`, `{Month}`, `{Day}`, `{Make}`, `{Model}`, `{City}`, `{Country}`, `{SequenceNumber}`
3. For `{City}` / `{Country}`: reverse-geocode GPS coordinates using `CLGeocoder` (no API key needed — uses Apple Maps)
4. Preview the new filename for each selected file before applying
5. Rename in-place using `FileManager.moveItem(at:to:)`

#### F8 — iCloud Photos Library Integration
1. Request `PHPhotoLibrary` authorization (`NSPhotoLibraryUsageDescription`)
2. Use `PHFetchRequest` to enumerate assets — filter by media type, album, date range
3. Export asset to a temp file via `PHImageRequestOptions` with `isSynchronous: false`
4. Run the existing metadata inspector and strip pipeline on the temp file
5. Write back via `PHPhotoLibrary.performChanges` + `PHAssetChangeRequest.revertAssetContentToOriginal` (or save as new asset)

#### F9 — Metadata Comparison Across Files
1. Allow multi-select in the file list (currently single-select)
2. When 2+ files are selected, show a "Compare" panel instead of the single-file inspector
3. Render a grid: rows = metadata fields, columns = files — cells show the value per file
4. Highlight cells where values differ across files (yellow) or where a field is missing in some files (red)
5. "Strip All GPS" button applies to all selected files at once

#### F10 — Copyright & Watermark Stamper
1. Add a "Stamp" tab in the strip options panel
2. **Metadata stamp**: user fills in Author, Copyright, Description → ExifTool writes these after stripping
3. **Visual watermark** (PRO+): use Core Graphics to render text or a logo image over the photo
   - Options: position (corner), opacity, font size, text vs image watermark
   - Process in a temp buffer; save as a new file alongside the original
4. Combine with watch folder feature: auto-strip + auto-stamp incoming files
