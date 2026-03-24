# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Budget Planner — transforms `budget` code blocks in Obsidian notes into interactive tables with categories, checkboxes, sorting, and auto-summation. Built with Svelte 5, Vite 7, TypeScript, and CodeMirror 6. Plugin ID: `budget-planner`.

## Setup

Requires Node.js >= 22. Install dependencies with `npm install`. For local development, symlink `dist/` into your Obsidian vault's `.obsidian/plugins/budget-planner/` directory.

## Commands

```bash
npm run dev              # Development build with watch mode
npm run build            # Production build (outputs to dist/)
npm run test             # Run all tests (Vitest)
npx vitest run path/to/file.test.ts  # Run a single test file
npm run lint             # ESLint check (flat config, v9)
npm run lint:fix         # ESLint auto-fix
npm run format           # Prettier format
npm run format:check     # Prettier check only
npm run typecheck        # Svelte + TypeScript type checking
./scripts/release X.X.X  # Bump version, commit, tag, push (must be on master)
```

## Architecture

### Plugin Lifecycle

`src/main.ts` → exports `BudgetPlannerPlugin` (extends Obsidian `Plugin`).
`src/Plugin.ts` → loads settings, registers a CodeMirror extension (`tableExtension`), registers commands, adds settings tab.

### CodeMirror Integration (Editor Layer)

`src/codeblocks/tableExtension.ts` — StateField-based decoration that detects ` ```budget ``` ` blocks via regex and replaces them with `TableWidget` instances. Uses incremental updates: widget-dispatched changes (tagged with `widgetChangeAnnotation`) and external changes without fence markers use `RangeSet.map()` instead of full rebuild.

`src/codeblocks/TableWidget.ts` — CodeMirror `WidgetType` that mounts a Svelte `Table` component. Handles bidirectional sync between markdown text and the interactive UI with immediate writes on every store mutation. Position lookup uses decoration set iteration via `getTableField()` registry (avoids circular imports).

### Parser / Formatter (Data Layer)

`src/codeblocks/BudgetCodeParser.ts` — Parses budget markdown into structured data (`Map<CategoryId, string>` for categories, `Map<CategoryId, TableRow[]>` for rows). Categories are lines ending with `:`, rows must contain `|` separator and use `[x]/[ ] | name | amount | comment` syntax. Lines without `|` are skipped. IDs are generated at parse time with nanoid and not persisted.

`src/codeblocks/BudgetCodeFormatter.ts` — Converts structured data back to column-aligned markdown. Strips trailing colons from category names before adding the `:` marker. Trims trailing whitespace from rows without comments. Skips rows missing both name and amount.

`src/codeblocks/constants.ts` — Shared constants: `BUDGET_BLOCK_REGEX` (multiline, requires closing fence at line start), `widgetChangeAnnotation`, and `registerTableField`/`getTableField` registry for StateField access without circular imports.

### UI Components (Svelte 5)

All in `src/codeblocks/ui/componets/Table/` (note: `componets` typo is intentional in the directory name).

- `Table.svelte` — Root component, sets up Svelte context with stores and actions
- `Head/`, `Row/`, `CategoryRow/`, `CategoryFooter/`, `Footer/` — Table sections
- `AddRow/` — Row insertion UI (includes `Icon/` subcomponent)
- `Editable/` — Inline-editable cell component

Drag-and-drop reordering of categories and rows is powered by `sortablejs`.

Uses Svelte 5 runes (`$props()`, `$state()`) and context API for dependency injection.

### State Management

Two stores passed via Svelte context:

- **TableStore** — data: categories map + rows map
- **TableStateStore** — UI state: selected row, editing/saving flags

All mutations go through `createStoreActions()` in `src/codeblocks/ui/componets/Table/actions.ts`.

### Settings & Commands

`src/settings/` — Plugin settings with configurable default budget block template.
`src/commands/` — Command palette integration ("Insert Budget Planner").

## Code Conventions

- Path alias: `@/*` → `src/*`
- Output format: CommonJS (required by Obsidian)
- Svelte strict mode off; Prettier plugin handles Svelte formatting
- `_` prefix for intentionally unused variables
- TypeScript: `strictNullChecks`, `noImplicitAny`, `verbatimModuleSyntax`

## Testing

Tests live in `tests/` (parser/formatter/regex) and co-located with source (`*.test.ts`). Uses Vitest + Testing Library Svelte. Key test files:

- `tests/BudgetCodeParser.test.ts`
- `tests/BudgetCodeFormatter.test.ts`
- `tests/BudgetBlockRegex.test.ts`
- `tests/changesAffectBlockStructure.test.ts`
- `src/codeblocks/helpers/generateId.test.ts`
- `src/codeblocks/ui/componets/Table/Row/helpers.test.ts`

## CI/CD

GitHub Actions runs lint, typecheck, and test in parallel on every push. Release workflow triggers on tag push, verifies the tag is on master, builds, and creates a draft GitHub release.
