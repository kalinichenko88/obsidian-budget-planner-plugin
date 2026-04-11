# Release Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the shell-script release flow with a Claude-driven `/release X.Y.Z` slash command that generates a user-facing `CHANGELOG.md` entry and publishes a GitHub release whose body is extracted from that same file.

**Architecture:** The `/release` slash command prompt drives the entire flow: pre-flight checks → gather commits since last `v*` tag → draft a CHANGELOG section in user-facing English → interactive approval → write CHANGELOG.md → bump versions → commit/tag/push. The existing GitHub Actions release workflow is taught to extract the new version's section from `CHANGELOG.md` and publish a non-draft release. The contract between the two is `CHANGELOG.md` itself — no side files, no post-publish edits.

**Tech Stack:** Node.js + Vitest (existing); awk (for extraction); Bash; GitHub Actions; markdown.

**Spec reference:** `docs/superpowers/specs/2026-04-11-release-flow-design.md`

---

## Deviation from spec

The spec shows the extraction awk **inline** in `.github/workflows/release.yml`. This plan extracts it into a standalone `scripts/extract-release-notes.awk` file for two reasons:

1. **Testability** — the awk can be unit-tested with Vitest by spawning `awk -f scripts/extract-release-notes.awk` against fixture strings.
2. **Runnable locally** — the user can debug extraction problems without kicking off a real release.

The awk logic, the extraction contract, the failure behavior, and the YAML step structure are all unchanged. The YAML step just references the script file with `-f` instead of embedding the program as a string.

---

## File map

| Status | File | Responsibility |
|---|---|---|
| NEW | `.claude/commands/release.md` | Slash command prompt — drives the full release flow end to end |
| NEW | `scripts/extract-release-notes.awk` | Extracts one version's bullet body from `CHANGELOG.md` |
| NEW | `tests/ExtractReleaseNotes.test.ts` | Vitest tests for the awk script (runs via `spawnSync('awk', …)`) |
| MODIFIED | `.github/workflows/release.yml` | Adds the extraction step; `gh release create` gets `--notes-file`, loses `--draft` |
| MODIFIED | `docs/release-process.md` | Rewritten to describe the new `/release` flow |
| MODIFIED | `CLAUDE.md` | "Commands" section: replace `./scripts/release X.X.X` with `/release X.Y.Z` |
| DELETED | `scripts/release` | Responsibilities moved into the slash command |
| UNCHANGED | `scripts/version-bump.js` | Still invoked from the slash command |
| NOT CREATED NOW | `CHANGELOG.md` | The slash command creates it on the first `/release` run; not part of this implementation |

**Branch guidance:** implement on a fresh branch off master (suggested name: `feature/claude-release-flow`). Do not mix with the in-progress `chore/refactoring` branch.

---

## Task 1: The awk extraction script (TDD)

**Files:**
- Create: `scripts/extract-release-notes.awk`
- Create: `tests/ExtractReleaseNotes.test.ts`

### Step 1.1 — Write the test file with all cases (failing)

Create `tests/ExtractReleaseNotes.test.ts` with this exact content:

```typescript
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const awkScript = resolve(here, '..', 'scripts', 'extract-release-notes.awk');

function extractNotes(changelog: string, version: string): string {
  const result = spawnSync(
    'awk',
    ['-v', `ver=${version}`, '-f', awkScript],
    { input: changelog, encoding: 'utf8' }
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`awk exited with ${result.status}: ${result.stderr}`);
  }
  return result.stdout;
}

const twoVersions = [
  '# Changelog',
  '',
  'All notable changes to this project are documented here.',
  '',
  '## [1.2.2] - 2026-05-01',
  '',
  '### Added',
  '- Brand-new feature X',
  '',
  '## [1.2.1] - 2026-04-11',
  '',
  '### Fixed',
  '- Bug Y is fixed',
  '- Bug Z is fixed',
  '',
  '### Under the hood',
  '- Upgraded build tooling',
  '',
  '[1.2.2]: https://github.com/kalinichenko88/obsidian-budget-planner-plugin/compare/v1.2.1...v1.2.2',
  '[1.2.1]: https://github.com/kalinichenko88/obsidian-budget-planner-plugin/compare/v1.2.0...v1.2.1',
  '',
].join('\n');

const singleVersion = [
  '# Changelog',
  '',
  '## [1.0.0] - 2026-01-01',
  '',
  '### Added',
  '- Initial release',
  '',
  '[1.0.0]: https://github.com/kalinichenko88/obsidian-budget-planner-plugin/compare/v0.0.0...v1.0.0',
  '',
].join('\n');

describe('extract-release-notes.awk', () => {
  it('extracts the body of the newest version, stopping at the next version header', () => {
    const notes = extractNotes(twoVersions, '1.2.2');
    expect(notes).toBe(
      [
        '',
        '### Added',
        '- Brand-new feature X',
        '',
        '',
      ].join('\n')
    );
  });

  it('extracts a middle/older version body', () => {
    const notes = extractNotes(twoVersions, '1.2.1');
    expect(notes).toBe(
      [
        '',
        '### Fixed',
        '- Bug Y is fixed',
        '- Bug Z is fixed',
        '',
        '### Under the hood',
        '- Upgraded build tooling',
        '',
        '',
      ].join('\n')
    );
  });

  it('stops at the compare-link block when the version is the only one', () => {
    const notes = extractNotes(singleVersion, '1.0.0');
    expect(notes).toBe(
      [
        '',
        '### Added',
        '- Initial release',
        '',
        '',
      ].join('\n')
    );
  });

  it('returns empty output when the requested version is not present', () => {
    const notes = extractNotes(twoVersions, '9.9.9');
    expect(notes).toBe('');
  });

  it('handles dotted version numbers without regex escape issues', () => {
    // The awk uses dynamic regex concatenation. A dot in the version
    // must not silently match another character.
    const tricky = [
      '## [1x2x1] - 2026-04-11',
      '',
      '### Added',
      '- Wrong match',
      '',
      '## [1.2.1] - 2026-04-11',
      '',
      '### Fixed',
      '- Real match',
      '',
      '[1.2.1]: https://example.com/compare/v1.2.0...v1.2.1',
      '',
    ].join('\n');

    const notes = extractNotes(tricky, '1.2.1');
    expect(notes).toContain('- Real match');
    expect(notes).not.toContain('- Wrong match');
  });
});
```

### Step 1.2 — Run tests to verify they fail

Run: `npx vitest run tests/ExtractReleaseNotes.test.ts`

Expected: All five tests fail because `scripts/extract-release-notes.awk` does not exist yet (awk will error with "cannot open file").

### Step 1.3 — Create the awk script

Create `scripts/extract-release-notes.awk` with this exact content:

```awk
# Extract one version's body from CHANGELOG.md.
#
# Usage:
#   awk -v ver=1.2.1 -f scripts/extract-release-notes.awk CHANGELOG.md
#
# Rules:
#   - Starts printing after a line matching  ## [<ver>] <space>
#     (the trailing space disambiguates "1.2.1" from "1.2.10")
#   - Stops at the next  ## [  header (previous version section)
#   - Stops at the compare-link block at the file bottom ( ^[name]: ... )
#   - Skips the matched header line itself
#
# Uses index() instead of regex for the version match so that dots in the
# version number are treated literally, not as "any character".

index($0, "## [" ver "] ") == 1 { found = 1; next }
found && index($0, "## [") == 1 { exit }
found && /^\[[^]]+\]: / { exit }
found { print }
```

**Why `index()` instead of a regex for the version match:** in awk's ERE, `.` matches any character. A naive regex like `^## \[1.2.1\]` would also match `## [1x2x1]`. The fifth test in Step 1.1 exercises this case. `index(s, t) == 1` asks "is `t` a literal prefix of `s`?" — no regex interpretation, no dot surprise.

**Why the trailing space in `"## [" ver "] "`:** without it, `1.2.1` would prefix-match `## [1.2.10] - ...`. The trailing space requires the `]` to be followed by a space, which our header format (`## [X.Y.Z] - YYYY-MM-DD`) always produces.

**The next-version exit** (`index($0, "## [") == 1`) and **compare-link exit** (`/^\[[^]]+\]: /`) are regex-safe because neither depends on the version variable.

### Step 1.4 — Run tests to verify they pass

Run: `npx vitest run tests/ExtractReleaseNotes.test.ts`

Expected: all five tests pass.

If the first test fails on whitespace differences: the assertions use `toBe` with trailing blank lines because `awk` prints a newline after the last record and `gh release create --notes-file` trims trailing whitespace naturally. Do not change the awk to strip blank lines — leave that to the consumer. Update the test assertions to match exact awk output only if the difference is a real bug (e.g., missing content), not a cosmetic whitespace mismatch.

### Step 1.5 — Verify lint/format pass

Run: `npm run lint && npm run format:check`

Expected: no errors.

If Prettier complains about the test file, run `npm run format` to auto-fix.

### Step 1.6 — Commit

```bash
git add scripts/extract-release-notes.awk tests/ExtractReleaseNotes.test.ts
git commit -m "feat(release): add awk extractor for CHANGELOG.md sections"
```

---

## Task 2: Update `release.yml` to use the extractor and auto-publish

**Files:**
- Modify: `.github/workflows/release.yml`

### Step 2.1 — Open the current workflow

Read `.github/workflows/release.yml` to confirm its current shape. The build step should end with `npm run build` followed by a "Create release" step that runs `gh release create ... --draft`.

### Step 2.2 — Add the "Extract release notes" step

Insert this new step immediately after `- run: npm run build`, before the "Create release" step:

```yaml
      - name: Extract release notes
        run: |
          tag="${GITHUB_REF#refs/tags/}"
          version="${tag#v}"
          awk -v ver="$version" -f scripts/extract-release-notes.awk CHANGELOG.md > release-notes.md

          if [ ! -s release-notes.md ]; then
            echo "::error::No CHANGELOG.md entry found for version $version"
            exit 1
          fi

          echo "--- release-notes.md ---"
          cat release-notes.md
          echo "--- end ---"
```

The `cat` block at the end is intentional: it echoes the extracted notes into the workflow log so a failed run is easy to diagnose.

### Step 2.3 — Rewrite the "Create release" step

Replace the existing `Create release` step with:

```yaml
      - name: Create release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          tag="${GITHUB_REF#refs/tags/}"
          gh release create "$tag" \
            --title="$tag" \
            --notes-file release-notes.md \
            dist/main.js dist/manifest.json
```

The two changes vs. the old step: added `--notes-file release-notes.md`, removed `--draft`.

### Step 2.4 — Verify the resulting file

Read `.github/workflows/release.yml` end to end. Confirm:

- `quality` job still exists and is unchanged.
- `release` job: `Checkout repository` → `Check if tag is on master` → `Setup Node.js` → `Cache dependencies` → `npm ci` → `npm run build` → **`Extract release notes`** → **`Create release`** (with `--notes-file`, no `--draft`).
- Indentation of the new steps matches the surrounding steps (6-space indent under `steps:`).
- No other steps or jobs were touched.

### Step 2.5 — Commit

```bash
git add .github/workflows/release.yml
git commit -m "ci(release): extract notes from CHANGELOG.md and auto-publish"
```

---

## Task 3: Write the `/release` slash command

**Files:**
- Create: `.claude/commands/release.md`

### Step 3.1 — Create the slash command file

Create `.claude/commands/release.md` with this exact content:

````markdown
---
description: Cut a new release — draft a CHANGELOG.md entry, bump versions, tag, and push
---

You are running the release flow for a version provided as `$ARGUMENTS`. Execute the following steps in order. **Stop immediately on any failure and clearly report what went wrong. Do not auto-rollback destructive git operations — the user will decide how to recover.**

Throughout these instructions, `<version>` is the value the user passed as `$ARGUMENTS` (e.g., `1.2.1`), and `<prev-tag>` is the previous `v*` tag discovered in Step 2.

The repository is `kalinichenko88/obsidian-budget-planner-plugin`.

## Step 1 — Pre-flight checks

All of these must pass before any mutation. If any fails, stop and report which check failed and why.

1. `$ARGUMENTS` must contain exactly one token matching `^\d+\.\d+\.\d+$`. If not, report usage: `/release X.Y.Z` and stop.
2. `git rev-parse --abbrev-ref HEAD` must output `master`.
3. `git status --porcelain` must be empty (clean working tree, no staged or unstaged changes).
4. `git fetch origin master`, then `git rev-parse HEAD` must equal `git rev-parse origin/master` (local master is up to date with remote).
5. `git rev-parse --verify v<version>` must **fail** (tag does not exist locally).
6. `git ls-remote --tags origin v<version>` must return empty (tag does not exist on the remote).
7. Read `versions.json` and confirm `<version>` is not already a key.

## Step 2 — Find the previous release

Run: `git describe --tags --abbrev=0 --match 'v*' HEAD`

- If it succeeds, its output is `<prev-tag>` (e.g., `v1.2.0`).
- If it fails with "No names found" (no `v*` tag exists yet — the first run of this flow), set `<prev-tag>` to empty. In that case, use `git rev-list --max-parents=0 HEAD | head -1` to get the root commit SHA for later compare-link construction.

Note: older tags without the `v` prefix (`1.0.0`, `1.0.1`, `1.0.2`, `1.1.0`, `1.2.0`) are intentionally ignored because the `--match 'v*'` filter excludes them. This matches the current workflow trigger pattern.

## Step 3 — Gather commits

If `<prev-tag>` is non-empty:

```
git log <prev-tag>..HEAD --format='=====%n%H%n%s%n%b'
```

Otherwise (first run, no prior `v*` tag):

```
git log HEAD --format='=====%n%H%n%s%n%b'
```

If the resulting output is empty, report "No commits since `<prev-tag>`" and stop — **do not release an empty version**.

## Step 4 — Draft the CHANGELOG.md entry

Classify each commit by its conventional-commit prefix:

| Prefix | Group |
|---|---|
| `feat` | Added |
| `fix` | Fixed |
| `perf` | Changed |
| `refactor`, `chore`, `style`, `docs`, `test`, `build`, `ci` | Under the hood |
| No recognized prefix | Pick the best fit by reading the subject |

Rules for drafting the entry:

- Rewrite each commit as a **short user-facing sentence** in English. Do **not** copy the commit subject verbatim — explain what the user will notice.
- Collapse **all** "Under the hood" commits into **one** bullet that summarizes the internal work at a high level (e.g., "Upgraded build tooling and refreshed core dependencies"). Do not list each internal commit separately.
- Omit any group that has no entries (no empty `### Added` heading).
- Use today's date (UTC) in `YYYY-MM-DD` format.

Produce a draft in this shape:

```markdown
## [<version>] - <YYYY-MM-DD>

### Added
- ...

### Changed
- ...

### Fixed
- ...

### Under the hood
- ...
```

## Step 5 — Present the draft for approval

Show the drafted section in a fenced markdown block in the chat. Ask the user:

> Does this look right, or do you want changes? I can reword bullets, merge/split them, or move items between groups.

Iterate on edits until the user **explicitly** approves (e.g., "ok", "approved", "yes", "go"). Do not proceed to Step 6 without explicit approval.

## Step 6 — Write CHANGELOG.md

Check whether `CHANGELOG.md` exists at the repo root.

### Case A: File does not exist

Create `CHANGELOG.md` with this exact content (replacing `<DRAFTED ENTRY>` with the approved draft from Step 5):

```markdown
# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<DRAFTED ENTRY>

[<version>]: https://github.com/kalinichenko88/obsidian-budget-planner-plugin/compare/<prev-tag>...v<version>
```

If `<prev-tag>` was empty in Step 2, use the root commit SHA from Step 2 in place of `<prev-tag>` in the compare URL.

### Case B: File exists

1. Insert the approved entry immediately after the header block (the lines `# Changelog`, the description paragraph, the blank line that follows), **above** the previous latest version's `## [...]` section.
2. Append one new line to the compare-link block at the bottom of the file:

   ```
   [<version>]: https://github.com/kalinichenko88/obsidian-budget-planner-plugin/compare/<prev-tag>...v<version>
   ```

   Put the new line at the top of the compare-link block so the newest version is first.

## Step 7 — Bump versions

Run:

```
node scripts/version-bump.js <version>
```

This updates `manifest.json`, `versions.json`, `package.json`, and `package-lock.json`.

## Step 8 — Commit

Stage and commit exactly these files:

```
git add CHANGELOG.md manifest.json versions.json package.json package-lock.json
git commit -m "Release <version>"
```

The commit message is plain `Release <version>` — **no Co-Authored-By trailer** (per user preference).

## Step 9 — Tag and push

```
git tag -a v<version> -m "v<version>"
git push origin master --tags
```

After the push succeeds, report to the user:

> Released `v<version>`. Watch the workflow at https://github.com/kalinichenko88/obsidian-budget-planner-plugin/actions

## Failure handling

If any command fails at any step, stop and report:

- Which step failed
- The exact command and its error output
- The current repo state (is there a new commit? a local tag? was anything pushed?)

Do **not** auto-revert commits, delete tags, or force-push. The user will decide how to recover.
````

### Step 3.2 — Verify the file looks right

Read `.claude/commands/release.md` and confirm:

- The YAML frontmatter (`--- description: ... ---`) is present and parseable.
- All nine steps are present.
- The version regex `^\d+\.\d+\.\d+$` is in Step 1.
- The repository URL `kalinichenko88/obsidian-budget-planner-plugin` appears in Step 6 (compare links) and Step 9 (actions URL).
- The commit message format is `Release <version>` with no Co-Authored-By line.

### Step 3.3 — Commit

```bash
git add .claude/commands/release.md
git commit -m "feat(release): add /release Claude Code slash command"
```

---

## Task 4: Delete the old `scripts/release` shell script

**Files:**
- Delete: `scripts/release`

### Step 4.1 — Delete the file

```bash
git rm scripts/release
```

### Step 4.2 — Confirm `scripts/version-bump.js` is untouched

Run: `ls scripts/`

Expected: only `version-bump.js` and (after Task 1) `extract-release-notes.awk` remain.

### Step 4.3 — Confirm no references to the old script remain

Use the Grep tool with pattern `scripts/release` and glob `!node_modules`.

Expected matches (these are fine — they'll be fixed in later tasks):
- `docs/release-process.md` (will be rewritten in Task 5)
- `CLAUDE.md` (will be updated in Task 6)
- `docs/superpowers/specs/2026-04-11-release-flow-design.md` (describes the deletion — leave alone)
- `docs/superpowers/plans/2026-04-11-release-flow.md` (this plan — leave alone)

If any **other** references exist (e.g., in `src/`, `tests/`, `.github/`, `package.json`), stop and flag them — they must be handled before committing this task.

### Step 4.4 — Commit

```bash
git add scripts/release
git commit -m "chore(release): remove obsolete shell release script"
```

(Note: `git rm` has already staged the deletion — `git add` here is a no-op safety net.)

---

## Task 5: Rewrite `docs/release-process.md`

**Files:**
- Modify: `docs/release-process.md`

### Step 5.1 — Read the current content

Read `docs/release-process.md`. The current file is 7 lines long and describes `./scripts/release <VERSION>`.

### Step 5.2 — Replace the entire file

Overwrite `docs/release-process.md` with this content:

```markdown
# 🚀 How to release

Releases are cut via the `/release` slash command in Claude Code.

## Prerequisites

- Clean working tree on `master`.
- Local `master` up to date with `origin/master` (`git fetch && git pull`).
- You know the next semver version number (`X.Y.Z`).

## Flow

1. Open Claude Code in the project directory.
2. Run the slash command:

   ```
   /release 1.2.3
   ```

3. Claude reads the commits since the last `v*` tag and drafts a `CHANGELOG.md` entry in user-facing English, grouped into **Added**, **Changed**, **Fixed**, and **Under the hood**.
4. Review the draft in the chat. Ask Claude to reword, merge, or move bullets until it reads the way you want.
5. Approve the draft. Claude then:
   - Writes (or appends to) `CHANGELOG.md`
   - Runs `node scripts/version-bump.js X.Y.Z` to bump `manifest.json`, `versions.json`, `package.json`, and `package-lock.json`
   - Commits the changes as `Release X.Y.Z`
   - Tags `vX.Y.Z` and pushes `master` with tags

6. GitHub Actions takes over:
   - Runs quality checks (lint, typecheck, tests)
   - Builds the plugin
   - Extracts the new version's section from `CHANGELOG.md`
   - Publishes a non-draft GitHub release with that section as the body and `main.js` + `manifest.json` as assets

## Recovery

If the workflow fails because the extraction returned nothing (e.g., `CHANGELOG.md` didn't get updated), the tag is still pushed. To retry:

```
git push --delete origin vX.Y.Z
git tag --delete vX.Y.Z
```

Fix `CHANGELOG.md`, then re-run `/release X.Y.Z`.

## Key files

- `.claude/commands/release.md` — the slash command prompt that drives the flow
- `scripts/extract-release-notes.awk` — awk program that extracts one version's body from `CHANGELOG.md`
- `scripts/version-bump.js` — updates the four version files
- `.github/workflows/release.yml` — CI release workflow
```

### Step 5.3 — Commit

```bash
git add docs/release-process.md
git commit -m "docs(release): rewrite release-process for /release slash command"
```

---

## Task 6: Update `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

### Step 6.1 — Read the current commands section

Read `CLAUDE.md` and locate the `## Commands` section (around the middle of the file). The current line is:

```
./scripts/release X.X.X  # Bump version, commit, tag, push (must be on master)
```

### Step 6.2 — Replace that line

Use the Edit tool to replace the old release line. The `old_string`:

```
./scripts/release X.X.X  # Bump version, commit, tag, push (must be on master)
```

The `new_string`:

```
/release X.Y.Z           # Cut a release via Claude Code (see docs/release-process.md)
```

Keep the trailing newline and the `npm run` line above it intact. The `#` comment column alignment will shift slightly; that's fine — don't try to re-align the whole block.

### Step 6.3 — Verify

Read the resulting `CLAUDE.md` commands section and confirm:
- The old line is gone.
- The new line is present.
- No surrounding lines were accidentally removed.

### Step 6.4 — Commit

```bash
git add CLAUDE.md
git commit -m "docs(claude): point release command at /release slash command"
```

---

## Task 7: Full verification pass

**Files:** none — read-only checks.

### Step 7.1 — Run the full test suite

Run: `npm test`

Expected: all tests pass, including the new `ExtractReleaseNotes` suite.

### Step 7.2 — Run lint + typecheck + format check

Run (in parallel is fine):

```
npm run lint
npm run typecheck
npm run format:check
```

Expected: all three pass with no errors.

### Step 7.3 — Verify the file map

Using the Glob and Read tools, confirm each of the following:

- `scripts/release` does **not** exist.
- `scripts/version-bump.js` exists and is unchanged.
- `scripts/extract-release-notes.awk` exists.
- `.claude/commands/release.md` exists and starts with `---` (YAML frontmatter).
- `tests/ExtractReleaseNotes.test.ts` exists.
- `.github/workflows/release.yml` contains `extract-release-notes.awk` and `--notes-file` and does **not** contain `--draft`.
- `docs/release-process.md` contains `/release` (not `./scripts/release`).
- `CLAUDE.md` commands section contains `/release X.Y.Z`.
- `CHANGELOG.md` does **not** yet exist (it will be created on the first real `/release` run).

### Step 7.4 — Report readiness

Tell the user:

> Implementation complete on branch `feature/claude-release-flow`. Ready to open a PR. The next release (first real use of `/release`) will be the acceptance test for the new flow — suggest a patch-level version for the smallest possible validation scope.

No commit for this task (it's verification only).

---

## Testing summary

**Automated (runs in `npm test`):**
- `tests/ExtractReleaseNotes.test.ts` — 5 cases covering the awk extractor against fixture CHANGELOG.md contents.

**Manual (requires real release):**
- `.github/workflows/release.yml` — end-to-end verified on the first real `/release` invocation.
- `.claude/commands/release.md` — end-to-end verified on the first real `/release` invocation.

The first-release-as-acceptance-test is a calculated trade-off: workflow YAML and slash-command prompts are not meaningfully unit-testable in this repo. The `Extract release notes` step logs `release-notes.md` into the workflow output so any issue is visible before `gh release create` runs, and a failing extraction aborts the workflow without creating a broken release.

## Out of scope (not in this plan)

- Backfilling `CHANGELOG.md` entries for `1.0.0`–`1.2.0`
- Pre-release / beta tag support
- Automatic rollback on failed releases
- Contributor or PR references in entries

Any of these can be a future plan against a future spec.
