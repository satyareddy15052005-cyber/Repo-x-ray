# REPO X-RAY

> **Understand Every Connection in Your Codebase.**  
> Transform real source code into interactive architecture maps, dependency insights, and an entirely new way to explore software.

REPO X-RAY is a client-side developer tool that performs deterministic static analysis, AST syntax parsing, module resolution, and dependency graph generation directly inside your web browser.

---

## ⚡ Key Highlights

- **100% Client-Side In-Browser Execution**: All JavaScript & TypeScript AST parsing occurs directly in browser memory. No source code or file paths ever touch an external server or cloud backend.
- **Deterministic AST Parsing**: Powered by Babel syntax parser with full TypeScript and JSX grammar support (`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`).
- **Real Module Resolution**: Handles relative imports, extension substitution, index files, `tsconfig.json` path aliases (`@/*`), and npm external packages.
- **Cycle Detection via Tarjan's SCC**: Directed graph cycle algorithm that computes strongly connected groups without combinatorial explosion.
- **Downstream Impact Explorer**: Traces blast radiuses via BFS reverse transitive graph traversals.
- **Side-by-Side Version Comparison**: Compare two locally stored analyses to detect added, removed, or modified files, dependency edges, and circular loops.
- **Zero Mock Data & Privacy First**: Everything displayed is computed from real source files and stored in IndexedDB via Dexie.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation & Local Run

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Build production distribution
npm run build

# Run TypeScript checks
npm run typecheck
```

Visit `http://localhost:3000` in your browser.

---

## 📁 Analysis Pipeline

1. **Source Ingestion**: Load local folders via the File System Access API or upload a `.zip` archive (decompressed client-side with `fflate`).
2. **Filtering & Security**: Automatically ignores `.git/`, `node_modules/`, `dist/`, `build/`, `.env`, and secret keys.
3. **AST Parsing**: Parses source files into syntax trees and extracts static imports, dynamic literals, re-exports, and exported declarations with line positions.
4. **Virtual Module Resolution**: Evaluates relative paths and `tsconfig.json` paths against the virtual file set.
5. **Graph Synthesis**: Builds nodes and deduplicated directed edges.
6. **Cycle & Metric Analysis**: Computes Tarjan strongly connected components, fan-in/fan-out metrics, and identifies potentially unreferenced files.
7. **Storage**: Persists analysis state in browser IndexedDB.

---

## 📊 Export Options

- **Standalone Offline HTML Report**: Self-contained single-file HTML document with executive metrics, circular groups, and tables.
- **Dependency Edge CSV**: Formatted spreadsheet of all resolved relationships (`source_path, target_path, specifier, kind, status`).
- **Structured JSON**: Complete dump of all analyzed nodes, edges, modules, and issues.
- **Portable `.rxray` Container**: Versioned archive that can be restored on another device without re-parsing source files.
- **Standalone SVG Architecture Canvas**: Download visual vectors of your codebase graph.

---

## 🛡️ Privacy Guarantee

REPO X-RAY does not transmit your source code, file contents, or repository metrics to any remote server or AI service. All computation occurs locally on your machine.
