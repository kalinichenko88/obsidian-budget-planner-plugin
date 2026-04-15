# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Edits to budget table cells are no longer silently lost when navigating to another page while a cell is focused.
- The trailing-newline insertion after budget blocks now uses the correct annotation, preventing unnecessary widget rebuilds.

## [1.2.4] - 2026-04-12

### Fixed

- Plugin commands now use sentence case and no longer include the plugin name as a prefix, matching Obsidian's style guidelines.
- Settings placeholder text now uses sentence case.
- The `authorUrl` in the manifest now points to the author's GitHub profile instead of the plugin repository.
- Internal cleanup: voided unhandled promise from `unmount()` in widget teardown, removed redundant type assertions, and fixed CodeMirror type usage to satisfy the Obsidian review bot.

## [1.2.3] - 2026-04-12

### Fixed

- Budget blocks in files saved with Windows-style line endings (CRLF) are now parsed and formatted correctly.

### Under the hood

- Added ESLint Unicorn plugin with code-quality rules and auto-fixed existing violations; updated CI actions to latest major versions; pinned the release command to the Sonnet model.

## [1.2.2] - 2026-04-12

### Added

- Long text in Name and Comment cells is now truncated with an ellipsis to keep the table layout tidy.

### Fixed

- Header and footer labels no longer wrap on small screens; the footer label and value now stack vertically on mobile.

### Under the hood

- Plugin releases now include a ZIP archive for easier manual installation; updated install docs and CI workflow accordingly.

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

[Unreleased]: https://github.com/kalinichenko88/obsidian-budget-planner-plugin/compare/1.2.4...HEAD
[1.2.4]: https://github.com/kalinichenko88/obsidian-budget-planner-plugin/compare/1.2.3...1.2.4
[1.2.3]: https://github.com/kalinichenko88/obsidian-budget-planner-plugin/compare/1.2.2...1.2.3
[1.2.2]: https://github.com/kalinichenko88/obsidian-budget-planner-plugin/compare/1.2.1...1.2.2
[1.2.1]: https://github.com/kalinichenko88/obsidian-budget-planner-plugin/compare/1.2.0...1.2.1
