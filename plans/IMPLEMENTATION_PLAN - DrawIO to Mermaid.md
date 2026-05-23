# IMPLEMENTATION PLAN — VC-003 DrawIO to Mermaid Converter

**Stack:** Single-file HTML + vanilla JS (no build step)  
**Live:** `http://100.93.94.115/drawio2mermaid/`  
**Repo:** `auto_deploy/drawio2mermaid/` in the scratch workspace  
**Deploy:** Push to git → GitHub Actions → rsync to VPS (nginx static file serving)

---

## What's Built

The converter is **fully implemented** as a single `index.html`. The ideas.json roadmap listed it as "Concept" but the app is live and working.

| Component | Location in `index.html` | Status |
|-----------|--------------------------|--------|
| XML parser (`DOMParser`) | `parseDrawIO()` | ✅ Done |
| Flowchart node type detection | `detectNodeType()` | ✅ Done |
| Shape → Mermaid format mapping | `formatNode()` | ✅ Done |
| Flowchart builder (subgraphs, edges) | `buildFlowchart()` | ✅ Done |
| Sequence diagram builder | `buildSequenceDiagram()` | ✅ Done |
| Diagram type auto-detection | `detectDiagramType()` | ✅ Done |
| 3-panel split UI (XML / Mermaid / Preview) | HTML layout | ✅ Done |
| Live Mermaid.js preview | `renderPreview()` | ✅ Done |
| Syntax highlighting in output panel | `syntaxHighlight()` | ✅ Done |
| Auto-convert on input (600ms debounce) | `autoConvert()` | ✅ Done |
| Drag & drop `.xml` / `.drawio` file upload | drop zone listeners | ✅ Done |
| Copy to clipboard | `copyMermaid()` | ✅ Done |
| Download as `.mmd` | `downloadMermaid()` | ✅ Done |
| Light/dark preview background toggle | `setPreviewBg()` | ✅ Done |
| Example diagram loader | `loadExample()` | ✅ Done |
| Responsive layout (single column on mobile) | CSS `@media` | ✅ Done |

**Supported shapes:** rect, rounded rect, diamond (decision), stadium (start/end), circle, cylinder, parallelogram, hexagon, swimlane/group (subgraph)  
**Supported diagram types:** Flowchart TD, Sequence Diagram

---

## Remaining Work

### Phase 1 — CLI Wrapper (Node.js)
**Goal:** Allow `drawio2mermaid input.xml > output.mmd` from the terminal for Git hooks and CI pipelines.

**Steps:**
1. Extract the parser logic (`parseDrawIO`, `detectNodeType`, `formatNode`, `buildFlowchart`, `buildSequenceDiagram`, `detectDiagramType`, `sanitizeLabel`, `nodeId`) into a standalone `lib/parser.js` (Node-compatible — replace `DOMParser` with `@xmldom/xmldom`)
2. Create `bin/drawio2mermaid.js` as a CLI entry point:
   - Accept file path as first argument or read from stdin
   - Output Mermaid syntax to stdout
   - Exit 1 with error message on parse failure
3. Add `package.json` with `"bin": { "drawio2mermaid": "bin/drawio2mermaid.js" }` for `npm link` / `npx` usage
4. Update `index.html` to load parser from `lib/parser.js` via a script tag (or keep inline — single-file mode still works)

**Acceptance:** `node bin/drawio2mermaid.js example.xml` outputs valid Mermaid. `echo $?` returns 0.

---

### Phase 2 — Compressed DrawIO Support
**Goal:** Handle `.drawio` files that use base64+zlib compressed `mxGraphModel` (the default format from draw.io desktop).

**Steps:**
1. Detect if the input is compressed: check if the root element is `<mxGraphModel compressed="1">` or if the content is a raw base64 string
2. Decompress using `pako` (browser) / `zlib` (Node): `pako.inflateRaw(atob(compressedStr))`
3. Parse the resulting XML string through the existing `parseDrawIO()` pipeline
4. Add a test with a real compressed `.drawio` file

**Acceptance:** Drag a `.drawio` file exported from draw.io desktop app → converts successfully without a "Invalid XML" error.

---

## Notes
- The web app is a single self-contained HTML file — no npm install, no build step.
- Mermaid.js is loaded from CDN (`cdn.jsdelivr.net/npm/mermaid@10`) — works offline only if cached.
- The parser uses browser's native `DOMParser`; the CLI wrapper needs `@xmldom/xmldom` as a drop-in replacement.
- Complex DrawIO styles (custom shapes, images, HTML labels with rich formatting) are intentionally mapped to the closest Mermaid equivalent rather than failing.

---

## AI Proposed Features

Features ordered by monetization potential. Current tool is free — these features justify a PRO tier or API subscription.

| # | Feature | Value Proposition | Monetization Model | Complexity |
|---|---------|-------------------|-------------------|------------|
| 1 | **Batch File Conversion** | Convert an entire folder of `.drawio` files at once, download as a ZIP of `.mmd` files | Primary PRO unlock — heavy users (teams, CI pipelines) hit this immediately | Medium |
| 2 | **Multi-format Export** (PlantUML, D2, GraphViz DOT) | Export converted diagrams to alternative text-diagram formats beyond Mermaid | Widens appeal to teams using PlantUML or D2; natural PRO add-on | Medium |
| 3 | **Additional Diagram Types** (Class, ER, State, Gantt) | Support DrawIO class diagrams, ER diagrams, state machines, and Gantt charts | Deep technical value — currently only flowchart + sequence; unlocks enterprise use cases | High |
| 4 | **REST API with API Key** | `POST /api/convert` accepts a `.drawio` file, returns Mermaid — for CI/CD and tooling integration | SaaS subscription model: metered by conversion volume; developer audience | Medium |
| 5 | **GitHub / GitLab Integration** | Connect repo, select `.drawio` files, convert and open a PR with the `.mmd` equivalents | High-value for engineering teams doing "diagrams as code" migration; team plan | High |
| 6 | **VS Code Extension** | Right-click `.drawio` file → "Convert to Mermaid" — output opens in a new tab | Distribution channel + PRO upsell; VS Code marketplace gives discoverability | Medium |
| 7 | **Mermaid → DrawIO Reverse Conversion** | Paste Mermaid code, get a `.drawio` XML file — the inverse direction | Completes the tool's utility loop; doubles the addressable use case | High |
| 8 | **Conversion History & Cloud Sync** | Save past conversions with timestamps, re-open or re-convert with one click | Justifies a user account / subscription; sticky retention feature | Medium |
| 9 | **Shareable Diagram Links** | After conversion, generate a short URL that renders the live Mermaid preview — shareable with colleagues | Viral growth loop; premium feature with storage backend | Medium |
| 10 | **Confluence / Notion Export** | One-click export of the converted Mermaid diagram directly into a Confluence page or Notion block | Enterprise appeal — documentation teams are the biggest DrawIO users | High |

### Feature Detail

#### F1 — Batch File Conversion
1. Add a "Batch" tab or a second drop zone that accepts multiple `.drawio`/`.xml` files (or a folder via `<input webkitdirectory>`)
2. Run each file through the existing `parseDrawIO()` function sequentially
3. Collect results: `[{ filename, mermaid, error? }]`
4. Display a results table: filename, status (✓ / ✗), preview toggle
5. Package all successful `.mmd` files into a ZIP via JSZip and trigger download
6. Gate behind PRO: free users can convert one file at a time (current behavior); PRO unlocks batch

#### F2 — Multi-format Export
The conversion pipeline already produces a Mermaid AST in string form. Adding new output formats means writing alternative serializers:
1. **PlantUML**: `@startuml` / `@enduml` wrapper; `->`, `-->`, `[decision]` notation
2. **D2**: `shape: diamond`, `->` edges; simpler syntax than Mermaid
3. **GraphViz DOT**: `digraph G { A -> B [label="Yes"] }`
4. Add a format selector dropdown in the toolbar next to "Convert"
5. The download button label updates to reflect the chosen format (`.puml`, `.d2`, `.dot`)

#### F3 — Additional Diagram Types
DrawIO XML for class diagrams uses `swimlane` + `mxCell` with `shape=mxgraph.uml.class` style:
1. **Class diagrams**: detect UML class shapes → emit `classDiagram` Mermaid syntax with attributes and methods
2. **ER diagrams**: detect entity + relationship shapes → emit `erDiagram` with cardinality
3. **State machines**: detect `shape=mxgraph.flowchart.state` → emit `stateDiagram-v2`
4. **Gantt charts**: DrawIO Gantt uses a table-like structure → emit `gantt` with task rows
5. Add to `detectDiagramType()` and add a corresponding `build*()` function for each type

#### F4 — REST API with API Key
1. Move the conversion logic to a Node.js backend (extract `parser.js` per CLI plan)
2. `POST /api/convert` — accepts `multipart/form-data` with a `.drawio` file, returns `{ mermaid: string, error?: string }`
3. API key auth: `Authorization: Bearer <key>` header — generate keys per user account
4. Rate limiting: free tier 10 conversions/day, PRO 1000/day, Enterprise unlimited
5. Return usage stats in response headers: `X-Quota-Used`, `X-Quota-Remaining`

#### F5 — GitHub / GitLab Integration
1. OAuth login with GitHub/GitLab
2. After auth, user selects a repo and branch — app lists all `.drawio` files via the API
3. User selects files to convert; app runs conversion and creates a new branch with `.mmd` files alongside originals
4. Opens a pre-filled PR: "Convert DrawIO diagrams to Mermaid for version-control readability"

#### F6 — VS Code Extension
1. Create a VS Code extension (`yo code` scaffold)
2. Register a command "DrawIO to Mermaid: Convert File" on `.drawio` / `.xml` files
3. Bundle `parser.js` in the extension — no network call, fully offline
4. Open result in a new editor tab with `.mmd` language mode
5. Publish to VS Code Marketplace (free extension → drives web tool discovery + PRO upsell)

#### F7 — Mermaid → DrawIO Reverse Conversion
Parse Mermaid syntax using a simple regex/state-machine parser (Mermaid's grammar is much simpler than DrawIO XML):
1. Detect diagram type from first line (`flowchart`, `sequenceDiagram`, `classDiagram`, etc.)
2. Parse node definitions and edge declarations
3. Generate `mxCell` elements with appropriate styles and geometries (auto-layout positions)
4. Wrap in `mxGraphModel` XML and offer download as `.drawio`

#### F8 — Conversion History & Cloud Sync
1. On each successful conversion, store `{ id, filename, mermaidCode, timestamp }` in `localStorage` (free, local-only)
2. PRO: sync history to a backend (simple key-value store per user account)
3. History panel (left sidebar or modal) — click any past entry to restore it to the editor panels
4. Add "re-convert" button to re-run the original XML through the latest parser version

#### F9 — Shareable Diagram Links
1. On convert success, show a "Share" button
2. `POST /api/share` — stores `{ mermaidCode }` in a database, returns a short ID
3. `/share/<id>` renders a read-only page with the live Mermaid preview and a "Copy Mermaid" button
4. Links expire after 30 days for free users; PRO links are permanent

#### F10 — Confluence / Notion Export
1. **Confluence**: Confluence supports Mermaid via the Mermaid macro. Use the Confluence REST API (`PUT /wiki/rest/api/content/{id}`) to insert a Mermaid macro block into a target page
2. **Notion**: Use the Notion API (`PATCH /blocks/{id}/children`) to insert a code block with `language: "mermaid"`
3. Auth: OAuth for both platforms
4. UI: after conversion, "Export to..." dropdown with Confluence / Notion options — user picks the target page
