# Fix data loss when navigating away from page with budget tables

## Overview

Fix a bug where edits to budget tables are silently dropped when the user navigates to another page while a cell is being edited. The root cause is that `findCurrentPosition()` in `TableWidget` relies on `this.container.isConnected`, which is always `false` by the time CodeMirror calls `destroy()` or blur events fire during page navigation. This makes both the blur-triggered write-back and the `destroy()` dirty-flush ineffective.

## Context

- Files involved:
  - `src/codeblocks/TableWidget.ts` - widget lifecycle, `findCurrentPosition`, `dispatchChanges`, `destroy()`
  - `src/codeblocks/tableExtension.ts` - StateField, decoration management
  - `src/codeblocks/constants.ts` - `getTableField`/`registerTableField` registry
  - `src/codeblocks/ui/componets/Table/Editable/Editable.svelte` - blur handling
  - `src/codeblocks/ui/componets/Table/Table.svelte` - store setup and syncToDocument
  - `src/codeblocks/ui/componets/Table/actions.ts` - store mutations
  - `src/Plugin.ts` - plugin lifecycle (no view-change hooks currently)
- Related patterns: widget uses `RangeSet` iteration for position lookup; all store mutations are synchronous with immediate `dispatchChanges`
- Dependencies: `@codemirror/state`, `@codemirror/view`, Svelte 5

## Root Cause Analysis

Three confirmed data loss paths:

1. **Navigate away while cell is focused (primary):** User types in a cell, then navigates away. CodeMirror detaches the widget DOM before `blur` fires. `handleOnLeave` in `Editable.svelte` calls `onChange` -> `updateRow` -> `dispatchChanges` -> `findCurrentPosition`, which checks `this.container.isConnected` (line 86 of TableWidget.ts). Since the DOM is already detached, this returns `null` and the write is silently dropped.

2. **`destroy()` dirty-flush is always a no-op:** The flush at `TableWidget.ts:189-195` calls `dispatchChanges(..., skipDestroyedCheck=true)`, but `findCurrentPosition` still checks `this.container.isConnected` first (line 86). Since CodeMirror removes the widget DOM before calling `destroy()`, `isConnected` is always `false`, so the flush never writes.

3. **Full rebuild on structural changes:** When `changesAffectBlockStructure` returns `true`, `buildDeco()` replaces all widgets. Any unsaved Svelte store state is discarded. This is unlikely in normal editing (since every keystroke writes immediately), but possible during async Svelte teardown.

## Development Approach

- **Testing approach**: TDD - write failing tests that reproduce each data loss path, then implement fixes
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Fix `findCurrentPosition` to work with disconnected DOM

The core fix: when the container is disconnected from the DOM, `findCurrentPosition` should fall back to looking up the widget's position directly from the StateField's decoration set without using `posAtDOM`. The widget can store its last known position and use the decoration set iteration to find itself by identity comparison.

**Files:**

- Modify: `src/codeblocks/TableWidget.ts`

- [x] Add a `lastKnownFrom` field to `TableWidget` that is updated every time `findCurrentPosition` succeeds via the normal (connected DOM) path
- [x] In `findCurrentPosition`, when `this.container` is null or disconnected, fall back to iterating the decoration set and matching by widget identity (`iter.value.spec.widget === this`) using `lastKnownFrom` as a hint for where to start looking
- [x] Ensure the fallback path returns a valid `{from, to}` even when the DOM is detached
- [x] Write tests for `findCurrentPosition` covering: connected DOM path, disconnected DOM fallback, and destroyed widget
- [x] Run project test suite - must pass before task 2

### Task 2: Fix the `destroy()` flush to actually persist pending changes

With `findCurrentPosition` fixed (task 1), the `destroy()` flush should now be able to write. However, there's another issue: the flush happens after `unmount()`, so the view's dispatch may fail if CodeMirror has already torn down. We need to ensure the flush runs before `unmount` and before the view is invalidated.

**Files:**

- Modify: `src/codeblocks/TableWidget.ts`

- [x] Move the dirty-flush logic to run BEFORE `unmount()` in `destroy()`, so the Svelte component is still alive and the store state is fresh
- [x] Remove the `skipDestroyedCheck` parameter from `dispatchChanges` and `findCurrentPosition` since the fallback path from task 1 makes it unnecessary
- [x] Add a guard to handle the case where `view.dispatch` throws during destruction (wrap in try/catch, already partially present)
- [x] Write tests verifying that `destroy()` flushes pending store state to the document when `dirty` is true
- [x] Run project test suite - must pass before task 3

### Task 3: Ensure blur-triggered writes succeed during navigation

The `Editable.svelte` blur handler calls `onChange` which eventually calls `dispatchChanges`. With tasks 1 and 2, the position lookup can work even when the DOM is detached. But we should also ensure the `isDestroyed` flag doesn't block legitimate blur-driven writes that fire between DOM detachment and `destroy()` being called.

**Files:**

- Modify: `src/codeblocks/TableWidget.ts`

- [x] Review the timing of `isDestroyed = true` relative to blur events; ensure `dispatchChanges` still works for blur-triggered writes that fire after DOM detachment but before `destroy()` completes
- [x] If `dispatchChanges` is called after `destroy()` has started but the view is still valid, allow the write to proceed (the `lastKnownFrom` fallback from task 1 handles position lookup)
- [x] Write tests simulating the blur-during-navigation sequence: detach DOM -> blur fires -> onChange -> dispatchChanges should succeed
- [x] Run project test suite - must pass before task 4

### Task 4: Add trailing newline fix

The `setTimeout` in `toDOM()` (line 167) dispatches a change without `widgetChangeAnnotation`, which could trigger unexpected rebuild paths. This is a minor issue but worth fixing while we're in this area.

**Files:**

- Modify: `src/codeblocks/TableWidget.ts`

- [x] Add `widgetChangeAnnotation.of(true)` to the trailing newline dispatch at line 172 so it takes the incremental remap path instead of potentially triggering `changesAffectBlockStructure`
- [x] Write a test verifying the trailing newline insertion uses the correct annotation
- [x] Run project test suite - must pass before task 5

### Task 5: Verify acceptance criteria

- [ ] Run full test suite (`npm run test`)
- [ ] Run linter (`npm run lint`)
- [ ] Run typecheck (`npm run typecheck`)

### Task 6: Update documentation

- [ ] Update CLAUDE.md if internal patterns changed (e.g., new `lastKnownFrom` field, changed `destroy()` semantics)
- [ ] Move this plan to `docs/plans/completed/`
