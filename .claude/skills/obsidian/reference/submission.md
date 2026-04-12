# Plugin Submission Requirements

Guidelines for publishing your plugin to the Obsidian community plugin directory.

## Repository Structure

```
your-plugin/
├── manifest.json       # Required: Plugin metadata
├── main.js            # Required: Compiled plugin code
├── styles.css         # Optional: Plugin styles
├── LICENSE            # Required: License file
└── README.md          # Recommended: Usage documentation
```

---

## Naming and Description Guidelines

The Obsidian release validation bot (`validate-plugin-entry.yml`) enforces these rules:

### Plugin ID (Required)

- **Cannot contain "obsidian"** (case-insensitive)
- **Cannot end with "plugin"**
- **Must use only**: lowercase alphanumeric characters, dashes (`-`), and underscores (`_`)
- Must be unique (not used by existing or removed plugins)
- Keep it short and simple (used for plugin folder name)

### Plugin Name (Required)

- **Cannot contain "Obsidian"** (case-insensitive)
- **Cannot end with "Plugin"**
- **Cannot start with "Obsi" or end with "dian"**
- Must be unique among existing plugins
- Use a clear, descriptive name

### Description (Required)

- **Cannot include "Obsidian"** (case-insensitive)
- **Cannot use phrases**: "This plugin", "This is a plugin", "This plugin allows"
- **Must end with punctuation**: `.`, `?`, `!`, or `)`
- **Recommended max 250 characters** (longer descriptions trigger readability warnings)
- Focus on what the plugin does, not what it is

### Author (Required)

- Must be the repository owner or a public member of the organization
- Repository must have issues enabled (warning)
- Must include a valid open source license

### Repository (Required)

- Format: `"owner/repo-name"`
- Must match the actual GitHub repository

### Manifest Synchronization

- Plugin `id`, `name`, and `description` must match `manifest.json` in the repository

---

**Examples:**

✅ Good:

```json
{
  "id": "daily-notes-helper",
  "name": "Daily Notes Helper",
  "description": "Enhance your daily notes workflow with templates and quick actions.",
  "author": "YourUsername",
  "repo": "YourUsername/daily-notes-helper"
}
```

❌ Bad:

```json
{
  "id": "obsidian-daily-notes-plugin", // Contains "obsidian" and ends with "plugin"
  "name": "Obsidian Daily Notes Plugin", // Contains "Obsidian" and ends with "Plugin"
  "description": "This is an Obsidian plugin that helps with daily notes" // Contains "Obsidian" and "This is...plugin", no punctuation
}
```

---

## ObsidianReviewBot Automated Scan

After submitting the PR, the `ObsidianReviewBot` runs an automated ESLint scan of your plugin source code. Issues are categorized as **Required** (must fix) and **Optional** (recommended).

### Key Behavior

- The bot scans the default branch of your repository (usually `master`/`main`)
- After pushing fixes, the bot rescans automatically within **6 hours**
- Do **NOT** open a new PR for re-validation — push fixes to your repo
- Do **NOT** rebase the PR — the reviewer handles that after approval
- If you believe a required change is incorrect, comment with `/skip` and the reason

### CodeMirror Type Resolution

The review bot's ESLint environment **cannot resolve types from `@codemirror/*` packages** (`@codemirror/view`, `@codemirror/state`, etc.). Types like `EditorView` and `StateField` become error types that act as `any`.

This triggers `@typescript-eslint/no-redundant-type-constituents` when these types appear in unions (e.g., `EditorView | null`), because `any | null` is redundant.

**Fix**: Avoid explicit union type annotations with CodeMirror types. Use optional properties instead:

❌ **INCORRECT** (triggers review bot):

```typescript
// Class property
private view: EditorView | null = null;

// Module-level variable
let _field: StateField<DecorationSet> | null = null;

// Function return type
function getField(): StateField<DecorationSet> | null { ... }
```

✅ **CORRECT** (avoids union in annotation):

```typescript
// Class property — optional avoids explicit union
private view?: EditorView;

// Module-level — wrap in object with optional property
const _fieldRef: { current?: StateField<DecorationSet> } = {};

// Function — omit return type, let TypeScript infer
function getField() {
  return _fieldRef.current;
}
```

### `eslint-plugin-obsidian` Local Testing

The official `eslint-plugin-obsidian` (npm: `eslint-plugin-obsidian`) requires **ESLint 8** and is incompatible with ESLint 9+/10+. If your project uses a newer ESLint version, you cannot run the bot's checks locally.

---

## Submission Process

### 1. Create GitHub Release

- Tag must match version in `manifest.json`
- Include: `manifest.json`, `main.js`, `styles.css`

### 2. Submit to community-plugins.json

Fork `obsidianmd/obsidian-releases` and add entry:

```json
{
  "id": "your-plugin-id",
  "name": "Your Plugin Name",
  "author": "Your Name",
  "description": "Short description.",
  "repo": "username/repo-name"
}
```

Create pull request.

### 3. Follow Developer Policies

- Comply with Obsidian's terms of service
- No malicious code
- Respect user privacy
- No analytics without disclosure

---

## Semantic Versioning

Follow semantic versioning:

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

---

## Testing Before Submission

- Test on mobile (if not desktop-only)
- Test with keyboard navigation
- Test in both light and dark themes
- Verify all ESLint rules pass
- Remove all sample/template code
- Ensure manifest.json is valid
- Include LICENSE file
