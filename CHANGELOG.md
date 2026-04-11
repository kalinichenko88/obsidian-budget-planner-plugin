# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2026-04-11

### Changed

- **Breaking:** Plugin ID renamed from `obsidian-budget-planner-plugin` to `budget-planner` to meet Community Plugin submission rules. Existing manual installs need to rename their plugin folder in `.obsidian/plugins/`.
- Editing is noticeably snappier: the editor now applies incremental updates instead of reparsing the whole document on every keystroke.
- The default budget block template now shows a realistic budget example instead of generic sample text.

### Fixed

- Prevented data loss when switching files mid-edit — changes are now synced to the document immediately rather than on teardown.
- Category names ending with `:` no longer get corrupted into `::` on round-trips through the parser.
- Lines missing the `|` separator no longer produce phantom rows in the table.
- Inline triple backticks in row names or comments no longer prematurely close the budget block.
- Undo, drag-and-drop, and column sorting now correctly refresh cell contents instead of showing stale data.
- Pressing Escape while editing no longer triggers an extra save.
- The "Delete category" context menu item now updates correctly after adding a second category.
- Checkbox state no longer visually resets when rows are reordered.
- The cursor can now move below a budget block at the end of a document.
- Inserting a budget block now adds a trailing newline so the cursor lands on a fresh line.
- Trailing whitespace is no longer written out in rows without comments.

### Under the hood

- Upgraded core tooling (Vite 8, TypeScript 6, ESLint 10, Vitest 4) and refreshed dependencies, refactored internal state management and decoration updates, expanded test coverage, and rebuilt the release workflow around a `/release` Claude Code slash command with automated CHANGELOG extraction.

[1.2.1]: https://github.com/kalinichenko88/obsidian-budget-planner-plugin/compare/1.2.0...1.2.1
