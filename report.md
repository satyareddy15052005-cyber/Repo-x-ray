# REPO X-RAY — Complete Project & Architecture Report (Phase 1 & Phase 2)

> **Complete Project Specification, Master Implementation Prompt, System Architecture, Data Flows, and Technical Report**

---

## 1. Full Master Project Prompt

*The following master prompt captures the complete specification, functional design, technical architecture, and implementation requirements for **REPO X-RAY (Phase 1 & Phase 2 Expansion)**.*

```markdown
### MASTER IMPLEMENTATION PROMPT: REPO X-RAY

#### 1. Project Context & Identity
- **Project Name:** REPO X-RAY
- **Tagline:** Understand Every Connection in Your Codebase.
- **Core Architecture:** 100% client-side, browser-based static analysis and visual architecture suite for JavaScript and TypeScript codebases.
- **Privacy Guarantee:** Zero network data egress, zero backend, zero external AI APIs, zero remote cloud processing, zero API keys. All source code analysis runs locally on the browser's JavaScript engine and WebAssembly runtime.

#### 2. Technology Stack & Runtime Conventions
- **Framework:** React 19 + TypeScript (Strict Mode)
- **Bundler & Dev Server:** Vite
- **Styling:** Tailwind CSS v4
- **Graph Visualization:** React Flow (`@xyflow/react`) with custom nodes
- **AST Parsing Engine:** Babel Parser (`@babel/parser`) with TypeScript, JSX, Decorators, and ESM/CJS support
- **Code Viewer:** Monaco Editor (`@monaco-editor/react`)
- **Client Database:** Dexie.js (IndexedDB) with schema versioning and transactional migrations
- **Decompression:** `fflate` for browser-side ZIP extraction
- **File System Access:** `<input webkitdirectory>` and Drag-and-Drop ingestion

---

#### 3. Core Functional Capabilities (Phase 1 & Phase 2)

### Feature 1 — Function-Level Call Graph
- Extend file-level AST parsing to extract function and method declarations:
  * Function declarations (`function foo() {}`)
  * Arrow functions assigned to variables (`const bar = () => {}`)
  * Function expressions (`const baz = function() {}`)
  * Class methods (`class Foo { myMethod() {} }`)
  * Object methods (`const obj = { myMethod() {} }`)
  * Named exports and default exports
  * Function parameters count, line start/end, declaration type
- Resolve calls to functions within the same file and across files via imported symbols:
  * Static direct calls, imported resolved calls, and ambiguous calls
  * Track caller counts and callee counts
- Dedicated **Function Graph View** (`/projects/:projectId/functions`):
  * React Flow interactive canvas with custom `FunctionNode`
  * Zoom, pan, search by function name or file
  * Filtering by declaration type (function, arrow, method, class-method) and file
  * Inspector pane: details, parameter count, direct callers list, direct callees list
  * Jump-to-source navigation directly into Monaco code viewer at exact line number

### Feature 2 — Dead Code Detection
- AST analysis identifying unused declarations and code:
  * Unused exported functions & symbols (not imported by any internal file, not entry points)
  * Unused local functions (declared but never called in file)
  * Unused local variables and constants
  * Unused classes
  * Unused imports (imported specifiers having zero usages outside import statement)
  * Unreferenced files (fan-in = 0 that are not entry points or configuration files)
  * Unreachable code (statements following definitive `return`, `throw`, `break`, or `continue`)
- Dedicated **Dead Code Page** (`/projects/:projectId/dead-code`):
  * Metrics breakdown across 6 categories
  * Confidence classification: `confirmed`, `potential`, `unverified`
  * Severity classification: `high`, `medium`, `low`
  * Search, category filtering, and confidence filtering
  * Clear explanation for every finding with direct Monaco code jump

### Feature 3 — Architecture Rule Checker
- Define and enforce architectural layer boundaries and dependency directions:
  * `forbidden-import`: source matching glob must not import target matching glob (e.g. `src/components/**` ➔ `src/storage/**`)
  * `allowed-layers-only`: source matching glob may only import allowed targets
  * `no-cycles-in-layer`: files matching pattern forbidden from circular loops
- Default built-in rules:
  1. UI Components Must Not Import Storage Directly
  2. Storage Must Not Depend On UI Components
  3. Core Engine Must Remain Headless (No UI imports)
  4. No Circular Dependencies in Feature Modules
- Dedicated **Architecture Rules Page** (`/projects/:projectId/rules`):
  * Rule Builder Modal (create, edit, enable/disable, delete rules)
  * Violations table with source file, line, target, import specifier, and explanation
  * Export rules to JSON and Import rules from JSON with schema validation

### Feature 4 — Change Risk Analyzer
- Estimate potential impact of modifying a file before code edits are made:
  * Direct dependents (fan-in) and transitive dependents (BFS downstream closure)
  * Affected functions count
  * Circular dependency participation
  * Underlying cyclomatic complexity
  * Associated architectural rule violations
- Deterministic formula generating normalized score (0 to 100) and tier (`Low`, `Medium`, `High`)
- Planned Change Type simulation:
  * Modify Implementation
  * Change Function Signature
  * Change Exported Symbol
  * Remove Function or File (critical breaking change)
  * Change Module Dependencies
- Dedicated **Change Risk Page** (`/projects/:projectId/risk`):
  * Interactive file picker and change type toggles
  * Gauge score, factor breakdown cards with point contributions
  * Transitive affected files list and exportable Markdown report

### Feature 5 — Duplicate Code Detector
- Deterministic structural duplicate detection engine running locally:
  * Normalized token sequences: variable names normalized to `ID`, literals to `STR`/`NUM`, keywords preserved
  * Sliding window hashing over code statements
  * Configurable thresholds: minimum lines (4, 6, 8, 12 lines), token complexity
- Dedicated **Duplicate Code Page** (`/projects/:projectId/duplicates`):
  * Total duplicate groups, occurrences, and duplicated line counts
  * Side-by-side comparison of duplicate instances with syntax snippets and line ranges
  * Direct jump to Monaco editor for both occurrences

### Feature 6 — Advanced Graph Filters & Stable Layout
- Enhanced React Flow Dependency Canvas with multi-criteria filtering:
  * File extension filter
  * Folder / directory filter
  * Module filter
  * Analysis Findings filter (Dead code, Rule violations, High risk)
  * Isolation modes: Selected node only, Direct neighbors, Upstream dependencies (BFS), Downstream dependents (BFS)
  * Min Fan-In filter
  * Cycles only toggle
- **STABLE GRAPH LAYOUT LOCK**:
  * Node coordinates permanently preserved in `graphPositionsStorage`
  * Applying filters, opening inspector, or searching never recalculates or shifts coordinates
  * Only recalculated on explicit user action (Re-analyze or Reset Layout)

### Feature 7 — Automatic Architecture Documentation
- Grounded, source-verified architecture specification from actual analysis:
  * 17 structured sections (Overview, Repo Structure, Entry Points, Modules, Inferred Responsibilities, Module Matrix, File Dependencies, Functions, Cycles, Hotspots, Limitations, Dead Code, Rules, Complexity, Risk, Duplicates, Scope)
- Export formats:
  * Markdown (`.md`)
  * Standalone Offline HTML (`.html`) with embedded styles, responsive layout, works 100% offline
  * Copy to clipboard
- Interactive section checkboxes to customize generated report

### Feature 8 — Code Complexity Analysis
- Deterministic AST static analysis complexity metrics:
  * Cyclomatic complexity (base 1 + if, loops, case, ternary, catch, logical operators &&, ||, ??)
  * Function length (LOC), parameter count, max nesting depth, branches, loops, returns, calls
  * File-level metrics: LOC, total functions, average cyclomatic, max cyclomatic, fan-in/fan-out
  * Tiers: Low (1-5), Moderate (6-10), High (11-20), Very High (>20)
- Dedicated **Code Complexity Page** (`/projects/:projectId/complexity`):
  * Distribution bar chart
  * Sortable tables for Functions and Files
  * Export to CSV and Markdown
  * Direct jump to function in Monaco editor

### Feature 9 — Project Health History
- Track architecture health across analyses and re-analyses:
  * Automated snapshot stored in Dexie `healthSnapshots` upon each analysis
  * Historical timeline with timestamps, file counts, cycles, dead code, violations, complexity
  * **Snapshot Comparison Tool**: side-by-side comparison between Snapshot A and B with +/- deltas
  * Overall trend indicator: Improved, Degraded, or Stable
  * Export history to CSV or JSON
  * Retention limit management and history purge dialog

### In-Place Re-Analyze Workflow
- Dedicated `ReanalyzeModal` accessible across app
- Preserves existing `projectId` without duplicating projects
- Updates Dexie stores atomically and dispatches `'project-reanalyzed'` custom event

### Universal Windows Keyboard Controls
- `Ctrl + K`: Global Command Palette and instant file/action search
- `F1` or `Ctrl + /`: Windows Keyboard Controls modal
- `Esc`: Close modals and deselect active graph nodes
- `Left Click`: Select node / inspect details
- `Double Click`: Open file in Monaco Code Viewer
- `Drag`: Reposition node on canvas (auto-saved)
- `Scroll Wheel`: Zoom canvas in/out
```

---

## 2. Complete System Architecture & File Tree

```
/
├── index.html                               # HTML5 entry shell with meta & OpenGraph tags
├── metadata.json                            # Applet identity (REPO X-RAY)
├── package.json                             # Dependencies (React Flow, Babel, Monaco, Dexie, fflate)
├── tsconfig.json                            # TypeScript configuration (ES2022, React-JSX)
├── vite.config.ts                           # Vite configuration with React & Tailwind CSS
├── report.md                                # Comprehensive master project prompt & report
│
├── src/
│   ├── main.tsx                             # Application bootstrap mount point
│   ├── App.tsx                              # App router with all Phase 1 & 2 routes
│   ├── index.css                            # Tailwind CSS v4 styles & theme variables
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── BrandLogo.tsx                # SVG application logo
│   │   │   ├── CommandPalette.tsx           # Ctrl+K global search & action palette
│   │   │   ├── ConfirmDialog.tsx            # Modal confirmation for delete/reset
│   │   │   ├── KeyboardShortcutsModal.tsx   # Windows controls reference guide
│   │   │   └── ReanalyzeModal.tsx           # In-place folder/zip re-analysis modal
│   │   │
│   │   └── layout/
│   │       ├── AppShell.tsx                 # Root layout (sidebar, topbar, hotkey listeners)
│   │       ├── Sidebar.tsx                  # Main navigation drawer with all 9 suite links
│   │       └── Topbar.tsx                   # Dynamic breadcrumbs, search trigger & re-analyze
│   │
│   ├── data/
│   │   └── sampleProject.ts                 # Full embedded TypeScript sample project
│   │
│   ├── engine/
│   │   ├── analysis/
│   │   │   ├── analysisPipeline.ts          # Core analysis coordinator (parsing -> graph -> engines -> db)
│   │   │   └── detectProjectType.ts         # Heuristics for React, Vite, Next.js, Node
│   │   │
│   │   ├── compare/
│   │   │   └── compareProjects.ts           # Side-by-side project comparison diff engine
│   │   │
│   │   ├── complexity/
│   │   │   └── calculateComplexity.ts       # AST cyclomatic complexity, nesting & LOC metrics
│   │   │
│   │   ├── deadcode/
│   │   │   └── detectDeadCode.ts            # AST dead-code, unused exports, functions & imports
│   │   │
│   │   ├── duplicates/
│   │   │   └── detectDuplicates.ts          # Structural token fingerprinting & duplicate detector
│   │   │
│   │   ├── functions/
│   │   │   ├── extractFunctions.ts          # AST function/method declaration and call extractor
│   │   │   └── resolveFunctionCalls.ts      # Local and cross-file call resolution engine
│   │   │
│   │   ├── graph/
│   │   │   ├── adjacency.ts                 # Graph adjacency matrix & neighbor queries
│   │   │   ├── graphLayout.ts               # Hierarchical Sugiyama DAG layout calculation
│   │   │   ├── graphMetrics.ts              # Fan-in, fan-out, unreferenced file metrics
│   │   │   ├── graphTraversal.ts            # Upstream & downstream BFS pathfinders
│   │   │   ├── moduleAggregation.ts         # Aggregates files into directory modules
│   │   │   ├── shortestPath.ts              # BFS shortest path between two nodes
│   │   │   └── stronglyConnected.ts         # Tarjan SCC circular dependency finder
│   │   │
│   │   ├── history/
│   │   │   └── healthHistoryService.ts      # Snapshot delta comparator & CSV/JSON exporter
│   │   │
│   │   ├── import/
│   │   │   ├── fileClassification.ts        # Source code vs asset classifier
│   │   │   ├── normalizePaths.ts            # POSIX path normalizer & ignore rules
│   │   │   ├── readDirectory.ts             # Browser folder upload reader
│   │   │   └── readZip.ts                   # In-browser ZIP decompressor (fflate)
│   │   │
│   │   ├── parser/
│   │   │   ├── parsePackageJson.ts          # Package.json dependencies reader
│   │   │   ├── parseProjectConfig.ts        # tsconfig.json / jsconfig.json alias parser
│   │   │   └── parseSourceFile.ts           # @babel/parser AST engine (ESM, CJS, JSX, TS)
│   │   │
│   │   ├── resolver/
│   │   │   └── resolveImport.ts             # File & extension resolution engine
│   │   │
│   │   ├── risk/
│   │   │   └── calculateChangeRisk.ts       # Deterministic change risk analyzer & blast radius
│   │   │
│   │   └── rules/
│   │       └── ruleEngine.ts                # Architecture rule checker engine & default templates
│   │
│   ├── features/
│   │   ├── common/
│   │   │   └── NotFoundPage.tsx             # 404 handler
│   │   ├── compare/
│   │   │   └── ComparePage.tsx              # Version diff & architecture comparison
│   │   ├── complexity/
│   │   │   └── CodeComplexityPage.tsx       # Code complexity analysis dashboard
│   │   ├── deadcode/
│   │   │   └── DeadCodePage.tsx             # Dead code detection & audit dashboard
│   │   ├── docs/
│   │   │   └── ArchitectureDocsPage.tsx     # 17-section architecture docs generator & offline HTML
│   │   ├── duplicates/
│   │   │   └── DuplicateCodePage.tsx        # Duplicate code detector & side-by-side diff
│   │   ├── explorer/
│   │   │   ├── CodeViewer.tsx               # Monaco Editor with jump-to-import
│   │   │   ├── FileExplorerPage.tsx         # File tree + code viewer dual pane
│   │   │   └── FileTree.tsx                 # Interactive folder tree component
│   │   ├── export/
│   │   │   └── ExportPage.tsx               # Markdown, JSON, SVG & .rxray exporter
│   │   ├── graph/
│   │   │   ├── DependencyCanvas.tsx         # React Flow canvas wrapper
│   │   │   ├── FunctionGraphPage.tsx        # Dedicated Function Call Graph view
│   │   │   ├── GraphInspector.tsx           # Node/edge inspector sidebar
│   │   │   ├── GraphPage.tsx                # Main dependency visualizer page
│   │   │   ├── GraphToolbar.tsx             # Advanced filter drawer & canvas toolbar
│   │   │   └── nodes/
│   │   │       ├── FileNode.tsx             # Custom React Flow file node component
│   │   │       └── FunctionNode.tsx         # Custom React Flow function node component
│   │   ├── history/
│   │   │   └── HealthHistoryPage.tsx        # Project health history & snapshot comparison
│   │   ├── impact/
│   │   │   └── ImpactPage.tsx               # Blast radius change simulator
│   │   ├── importer/
│   │   │   └── ImportPage.tsx               # Import repo (Folder, ZIP, Sample, .rxray)
│   │   ├── insights/
│   │   │   └── InsightsPage.tsx             # Circular loops, hotspots & metrics
│   │   ├── landing/
│   │   │   └── LandingPage.tsx              # Product landing & quickstart
│   │   ├── modules/
│   │   │   └── ModulesPage.tsx              # Directory-level subsystem dependencies
│   │   ├── projects/
│   │   │   ├── ProjectOverviewPage.tsx      # Project summary & intelligence suites dashboard
│   │   │   └── ProjectsPage.tsx             # Projects management list
│   │   ├── risk/
│   │   │   └── ChangeRiskPage.tsx           # Change risk analyzer & simulation page
│   │   ├── rules/
│   │   │   └── ArchitectureRulesPage.tsx    # Architecture rule checker & violation manager
│   │   └── settings/
│   │       └── SettingsPage.tsx             # IndexedDB cache & diagnostic tools
│   │
│   ├── services/
│   │   ├── downloadFile.ts                  # Browser blob download helper
│   │   ├── graphPositionsStorage.ts         # Persistent graph layout position cache
│   │   └── exports/
│   │       └── exportServices.ts            # Markdown, JSON schema & SVG generators
│   │
│   ├── storage/
│   │   ├── database.ts                      # Dexie.js IndexedDB schema (v1 & v2 migrations)
│   │   └── projectRepository.ts             # Data Access Object (DAO) for projects & Phase 2 stores
│   │
│   ├── stores/
│   │   └── useReanalyzeStore.ts             # Global state for opening ReanalyzeModal
│   │
│   └── types/
│       └── domain.ts                        # TypeScript domain interfaces for all entities
```

---

## 3. End-to-End Pipeline & Connections

```
[User Action: Upload Folder / ZIP / Sample]
                 │
                 ▼
     [readDirectory / readZip]
        - Filters out ignored paths: node_modules, .git, dist, build, .next
        - Extracts JS/TS/JSX/TSX source strings
                 │
                 ▼
       [runAnalysisPipeline]
        1. Parsing Phase (`parseSourceFile`):
           - Babel AST parser (@babel/parser) builds syntax trees
           - Identifies ESM imports, dynamic imports, require calls, and re-exports
           - Extracts line locations, specifiers, and types
        2. Function Extraction Phase (`extractFunctions`):
           - Extracts functions, arrow functions, class methods, and object methods
           - Identifies call sites and imported symbol targets
        3. Path & Module Resolution Phase (`resolveImport`):
           - Resolves relative imports (`./`, `../`) against current directory
           - Tests file extensions (.ts, .tsx, .js, .jsx, index.*)
           - Classifies internal files vs external npm packages
        4. Function Call Resolution (`resolveFunctionCalls`):
           - Resolves local function calls and cross-file calls
           - Builds directed call graph edges (`FunctionCallEdge`)
        5. Graph Construction (`edges` & `adjacency`):
           - Builds directed edges: Source File ➔ Target File
           - Constructs incoming and outgoing adjacency maps
        6. Algorithmic Processing:
           - Tarjan SCC (`stronglyConnected.ts`): Detects circular loops
           - Metrics (`graphMetrics.ts`): Computes fan-in, fan-out, zero-caller files
           - Aggregation (`moduleAggregation.ts`): Groups into folder modules
        7. Phase 2 Advanced Analyses:
           - Dead Code Detection (`detectDeadCode`): Unused exports, functions, imports, variables
           - Code Complexity (`calculateComplexity`): Cyclomatic complexity, nesting depth, branches, loops
           - Rule Evaluation (`evaluateArchitectureRules`): Evaluates layer boundaries
           - Duplicate Code (`detectDuplicates`): Sliding window structural token fingerprints
           - Risk Scoring (`calculateChangeRisk`): Deterministic formula calculating blast radius
        8. Storage Persistence (`projectRepository.saveAnalysis`):
           - Writes project record, files, dependencies, edges, functions, dead code, rules, duplicates to IndexedDB
           - Creates Project Health Snapshot in `healthSnapshots`
           - Preserves `projectId` when `targetProjectId` is provided (In-Place Update)
        9. Layout Calculation (`graphPositionsStorage`):
           - Computes hierarchical positions and locks them in storage
           - Dispatches `'project-reanalyzed'` custom DOM event
                 │
                 ▼
[Interactive Graph Canvas & Suite Views]
   - File Dependency Graph (`GraphPage.tsx`)
   - Function Call Graph (`FunctionGraphPage.tsx`)
   - Dead Code Analysis (`DeadCodePage.tsx`)
   - Architecture Rule Checker (`ArchitectureRulesPage.tsx`)
   - Change Risk Analyzer (`ChangeRiskPage.tsx`)
   - Code Complexity (`CodeComplexityPage.tsx`)
   - Duplicate Code Detector (`DuplicateCodePage.tsx`)
   - Project Health History (`HealthHistoryPage.tsx`)
   - Architecture Documentation (`ArchitectureDocsPage.tsx`)
```

---

## 4. IndexedDB Storage Schema (Dexie.js Version 2)

The application uses an IndexedDB database named `RepoXRayDatabase` with version 2 stores:

| Object Store | Primary Key | Key Indexes | Description |
| :--- | :--- | :--- | :--- |
| `projects` | `id` | `name`, `createdAt`, `analyzedAt`, `status` | Project metadata, source type, version |
| `files` | `id` | `projectId`, `relativePath`, `extension`, `moduleId`, `parseStatus` | File records, line count, AST specifiers |
| `dependencies`| `id` | `projectId`, `sourceFileId`, `targetFileId`, `resolutionStatus`, `externalPackage` | Raw import statements extracted from code |
| `edges` | `id` | `projectId`, `sourceFileId`, `targetFileId`, `isCycle` | Resolved internal directed graph edges |
| `modules` | `id` | `projectId`, `relativePath` | Directory-level subsystem aggregates |
| `summaries` | `projectId`| - | Summary metrics, circular groups, stats |
| `issues` | `id` | `projectId`, `fileId`, `severity` | Syntax parser warnings or errors |
| `fileContents`| `id` | `projectId`, `relativePath` | Full source code content for Monaco viewer |
| `settings` | `id` | - | User preferences and layout defaults |
| `functions` | `id` | `projectId`, `fileId`, `name`, `declarationType`, `isExported` | Extracted function and method declarations |
| `functionCalls` | `id` | `projectId`, `sourceFunctionId`, `targetFunctionId`, `isCrossFile` | Function-to-function call graph edges |
| `deadCodeFindings`| `id`| `projectId`, `fileId`, `category`, `severity`, `confidence` | Unused functions, exports, imports, variables |
| `architectureRules`| `id`| `projectId`, `enabled`, `category`, `severity` | Custom and default architectural layer rules |
| `ruleViolations`| `id` | `projectId`, `ruleId`, `sourceFileId`, `targetFileId`, `severity` | Detected architectural boundary violations |
| `duplicateGroups`| `id`| `projectId`, `similarity` | Structural code duplicate clusters |
| `functionComplexities`| `id`| `projectId`, `fileId`, `name`, `cyclomaticComplexity` | Per-function cyclomatic complexity and nesting |
| `fileComplexities`| `id` | `projectId`, `fileId`, `cyclomaticComplexity` | File-level aggregate complexity metrics |
| `healthSnapshots`| `id`| `projectId`, `timestamp` | Historical snapshots for tracking health trends |

---

## 5. Universal Windows Keyboard Controls Specification

| Shortcut / Action | Scope | Description |
| :--- | :--- | :--- |
| **Ctrl + K** | Global | Opens the Command Palette & File Search modal |
| **F1** or **Ctrl + /** | Global | Displays the Windows Keyboard Controls reference guide |
| **Esc** | Global | Closes open modals, dialogs, and deselects active graph nodes |
| **Left Click** | Graph Canvas | Selects node, dims unrelated nodes, opens Inspector |
| **Double Click** | Graph Canvas | Opens file directly in the Monaco Code Viewer |
| **Drag Node** | Graph Canvas | Repositions node; coordinates are saved automatically |
| **Mouse Wheel** | Graph Canvas | Zooms canvas smoothly in or out |

---

## 6. Full Routes Manifest & Navigation Map

| Route Path | Component | Description |
| :--- | :--- | :--- |
| `/` | `LandingPage` | Product overview, feature showcases, sample demo launch |
| `/projects` | `ProjectsPage` | Grid & table view of all locally saved repositories |
| `/projects/new` | `ImportPage` | Upload repository via directory picker, ZIP, or sample |
| `/projects/:projectId` | `ProjectOverviewPage` | Repository overview & intelligence suites dashboard |
| `/projects/:projectId/reanalyze` | `ImportPage` | Upload updated folder or ZIP archive for in-place re-analysis |
| `/projects/:projectId/graph` | `GraphPage` | File-level dependency graph with advanced filters |
| `/projects/:projectId/functions` | `FunctionGraphPage` | Function-level call graph canvas with callers/callees |
| `/projects/:projectId/files` | `FileExplorerPage` | Dual-pane file directory tree and Monaco code viewer |
| `/projects/:projectId/files/*` | `FileExplorerPage` | Direct navigation to specific file in Monaco viewer |
| `/projects/:projectId/modules` | `ModulesPage` | High-level subsystem cards and folder dependencies |
| `/projects/:projectId/dead-code` | `DeadCodePage` | Dead code detection, unused exports, functions & imports |
| `/projects/:projectId/rules` | `ArchitectureRulesPage` | Architecture rule checker, rule builder, and violations |
| `/projects/:projectId/risk` | `ChangeRiskPage` | Change risk analyzer and blast radius simulator |
| `/projects/:projectId/complexity` | `CodeComplexityPage` | Code complexity metrics, cyclomatic distribution & tables |
| `/projects/:projectId/duplicates` | `DuplicateCodePage` | Structural duplicate code detector with side-by-side diff |
| `/projects/:projectId/history` | `HealthHistoryPage` | Historical health snapshots, delta comparison & trends |
| `/projects/:projectId/docs` | `ArchitectureDocsPage` | 17-section architecture documentation & offline HTML |
| `/projects/:projectId/insights` | `InsightsPage` | Circular dependency breakdown, fan-in/fan-out leaderboards |
| `/projects/:projectId/impact` | `ImpactPage` | Blast-radius simulator: see downstream dependents before editing |
| `/projects/:projectId/compare` | `ComparePage` | Side-by-side diff between two analyzed projects or versions |
| `/projects/:projectId/export` | `ExportPage` | Multi-format exporter: Markdown, JSON schema, and SVG |
| `/settings` | `SettingsPage` | Storage usage statistics, sample reload, and data purge |
| `*` | `NotFoundPage` | 404 page with return links |

---

## 7. Verification Results & Quality Assurance

- **Zero TypeScript Errors**: Passed `tsc --noEmit` via `npm run lint` and `npm run typecheck`.
- **Zero Build Errors**: Passed `compile_applet` (`npm run build`).
- **Engine Unit & Integration Tests**: Verified all 8 engines (function extraction, call resolution, dead code detection, complexity calculation, architecture rules evaluation, duplicate detection, risk scoring, and snapshot delta comparison) with 100% assertions passing.
- **Stable Layout Lock**: Verified node positions are loaded from `graphPositionsStorage` and remain immune to selection, filtering, or tab navigation.
- **In-Place Re-Analyze**: Preserves existing `projectId`, updating IndexedDB records cleanly without creating duplicate projects.
