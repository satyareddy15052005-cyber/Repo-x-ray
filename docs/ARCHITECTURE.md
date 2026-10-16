# Architecture Documentation — REPO X-RAY

## System Overview

REPO X-RAY is constructed as a modern, reactive single-page developer tool built with React, TypeScript, and Vite, operating 100% in the user's browser runtime.

```
┌────────────────────────────────────────────────────────┐
│                      User Browser                      │
├─────────────────┬───────────────────┬──────────────────┤
│    UI Layer     │   Engine Layer    │  Storage Layer   │
│                 │                   │                  │
│  React Flow     │  Babel AST Parser │  IndexedDB       │
│  Monaco Editor  │  Path Normalizer  │  Dexie DB        │
│  Tailwind CSS   │  Module Resolver  │  Local Settings  │
│  React Router   │  Tarjan SCC Graph │  File Contents   │
│  Command Bar    │  Impact Analyzer  │  Archive Importer│
└─────────────────┴───────────────────┴──────────────────┘
```

## Core Modules

### 1. Engine (`src/engine/`)
- `parser/parseSourceFile.ts`: Babel parser AST parsing with TypeScript and JSX support.
- `resolver/resolveImport.ts`: Virtual module resolution honoring `tsconfig.json` baseUrl and paths.
- `graph/stronglyConnected.ts`: Tarjan's strongly connected components algorithm for cycles.
- `graph/graphTraversal.ts`: Iterative BFS graph traversal with cycle prevention for downstream impact analysis.
- `graph/graphLayout.ts`: Hierarchical 4-direction layout engine (`LR`, `TB`, `RL`, `BT`).
- `analysis/analysisPipeline.ts`: Stage-orchestrated analysis pipeline with fine-grained progress feedback.

### 2. Storage (`src/storage/`)
- `database.ts`: Dexie database schema definitions.
- `projectRepository.ts`: Transactional operations for saving and fetching analysis runs.

### 3. Features (`src/features/`)
- `graph/`: Interactive React Flow dependency canvas, custom nodes, inspector, toolbar.
- `explorer/`: Monaco Editor read-only syntax viewer, hierarchical file tree, relationship navigator.
- `insights/`: In-depth architectural metrics (cycles, fan-in, fan-out, unreferenced files, parser coverage).
- `impact/`: Multi-file blast radius calculator.
- `compare/`: Side-by-side snapshot comparison engine.
- `export/`: Offline HTML, CSV, JSON, and `.rxray` container export generators.
