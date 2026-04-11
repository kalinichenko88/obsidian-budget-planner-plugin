# Release flow — design

**Status:** Approved
**Date:** 2026-04-11

## Goal

Replace the current shell-script release flow with a Claude-driven slash
command that generates a user-facing `CHANGELOG.md` entry and publishes a
GitHub release whose body is extracted from that same file. All release prose
is written in English, kept high-level, and free of internal-only detail.

## Current state

- `scripts/release <VERSION>` — branch check, version bump, commit, tag, push.
- `scripts/version-bump.js` — updates `manifest.json`, `versions.json`,
  `package.json`, and `package-lock.json` to the target version.
- `.github/workflows/release.yml` — triggers on `v*` tags, runs quality checks,
  builds, creates a **draft** GitHub release with `dist/main.js` and
  `dist/manifest.json` attached and an empty notes body.
- No `CHANGELOG.md` exists.
- Prior tags: `1.0.0`, `1.0.1`, `1.0.2`, `1.1.0`, `1.2.0` (no `v` prefix).
  Future tags use `v*` per the updated workflow trigger.
- Repository: `https://github.com/kalinichenko88/obsidian-budget-planner-plugin`.
- `docs/release-process.md` documents the current flow and will be rewritten.

## Target state

### Files changed

| File | Change |
|---|---|
| `.claude/commands/release.md` | **New.** Slash command prompt that drives the entire release flow end-to-end. |
| `CHANGELOG.md` | **New.** Keep a Changelog style. Starts fresh at the first release cut with the new flow. |
| `.github/workflows/release.yml` | **Modified.** Adds a notes-extraction step. `gh release create` now passes `--notes-file` and drops `--draft`. |
| `scripts/release` | **Deleted.** Responsibilities move into `.claude/commands/release.md`. |
| `scripts/version-bump.js` | **Unchanged.** Still invoked by the slash command via `node scripts/version-bump.js <version>`. |
| `docs/release-process.md` | **Rewritten.** Documents the new `/release X.Y.Z` flow. |

### Architecture

The contract between Claude and the GitHub workflow is **`CHANGELOG.md`
itself**: Claude owns writing it, the workflow owns reading one section out
of it. No hidden state, no side files, no post-publish edits.

```
User runs /release 1.2.1 in Claude Code
    │
    ▼
Claude reads commits since last v* tag (git log v1.2.0..HEAD)
    │
    ▼
Claude drafts a CHANGELOG.md entry in user-facing English
    │
    ▼
Claude shows the draft in the chat; user edits/approves interactively
    │
    ▼
Claude writes CHANGELOG.md, runs scripts/version-bump.js, commits, tags, pushes
    │
    ▼
GitHub Actions: quality → build → extract notes → publish release
```

## `CHANGELOG.md` format

Fresh file at the project root. Keep a Changelog 1.1.0 style with **four
groups**, empty groups omitted:

- `Added` — new user-facing features (`feat:` commits)
- `Changed` — behavior changes, perf improvements (`perf:` commits, some
  `feat:`/`fix:` by judgment)
- `Fixed` — user-visible bug fixes (`fix:` commits)
- `Under the hood` — a single collapsed line summarizing all internal work
  (`refactor`, `chore`, `style`, `docs`, `test`, `build`, `ci` commits)

### Rules for entries

- One bullet per user-visible change, written as a short sentence in
  user-facing English. Not a copy-paste of the commit subject.
- `Under the hood` is a single line — not a list of individual internal
  commits.
- Empty groups are omitted entirely (no empty `### Added` heading).
- Date is today's date in ISO format (`YYYY-MM-DD`).
- Version-compare links live in a block at the bottom, below all version
  sections. The workflow extraction stops before the compare-link block so
  the GitHub release body stays clean.

### File layout

```markdown
# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2026-04-11

### Fixed
- Budget block insertion now leaves a clean blank line below, so typing continues naturally.
- Moving the cursor past the bottom of a table no longer gets stuck at the document end.
- Switching files while editing a table no longer loses unsaved changes — edits are now written immediately.
- Checkbox visual state stays in sync after drag-and-drop reordering.

### Under the hood
- Upgraded build tooling (Vite 8, TypeScript 6, ESLint 10) and refreshed core dependencies.

[1.2.1]: https://github.com/kalinichenko88/obsidian-budget-planner-plugin/compare/v1.2.0...v1.2.1
```

New entries are inserted directly below the header block (above the previous
latest version). New compare links are appended to the bottom block.

## `/release` slash command flow

Lives at `.claude/commands/release.md`. Triggered as `/release 1.2.1`. The
command file is a prompt that instructs Claude to execute the following steps
in order, aborting on any failure.

### Step 1 — Pre-flight checks

All must pass before any mutation:

- Argument is present and matches `^\d+\.\d+\.\d+$`.
- Current branch is `master` (`git rev-parse --abbrev-ref HEAD`).
- Working tree is clean (`git status --porcelain` is empty).
- Local `master` is up to date with `origin/master` (`git fetch origin master`
  then compare `HEAD` to `origin/master`).
- Tag `v<version>` does not exist locally or on the remote
  (`git rev-parse v<version>` fails, `git ls-remote --tags origin v<version>`
  is empty).
- Target version is not already present in `versions.json`.

Any failure → stop, report the problem, do nothing else.

### Step 2 — Find the previous release

Run `git describe --tags --abbrev=0 --match 'v*' HEAD`. This finds the most
recent `v*` tag reachable from `HEAD`. Older non-`v` tags (`1.0.0`–`1.2.0`)
are intentionally ignored — the new flow only recognizes `v*` tags, matching
the workflow trigger pattern.

If no `v*` tag exists yet (the first run), the commit range is the entire
history reachable from `HEAD`.

### Step 3 — Gather commits

```
git log <prev-tag>..HEAD --format='%H%n%s%n%b%n---COMMIT---'
```

If the range is empty, Claude reports that there are no commits to release
and aborts. (Default behavior; no override.)

### Step 4 — Draft the `CHANGELOG.md` entry

Claude groups commits by conventional-commit type:

| Commit type | Group |
|---|---|
| `feat` | `Added` |
| `fix` | `Fixed` |
| `perf` | `Changed` |
| `refactor`, `chore`, `style`, `docs`, `test`, `build`, `ci` | `Under the hood` |
| Unconventional | Best-fitting group by judgment |

Claude rewrites each commit into a short user-facing sentence. Internal
commits are summarized as **one** `Under the hood` line.

### Step 5 — Present the draft and iterate

Claude prints the full drafted section in the chat and asks for approval.
The user can edit wording, merge or split bullets, move items between
groups, or change the voice. Claude re-renders and asks again. The loop
continues until the user explicitly approves.

### Step 6 — Write `CHANGELOG.md`

- If the file doesn't exist: create it with the header block, the new entry,
  and the compare link.
- If it exists: insert the new `## [X.Y.Z] - <date>` section immediately
  after the header block (above the previous latest version) and append the
  new compare link to the bottom block.

### Step 7 — Bump versions

```
node scripts/version-bump.js <version>
```

Unchanged from today. Updates `manifest.json`, `versions.json`,
`package.json`, and `package-lock.json`.

### Step 8 — Commit

Stage exactly these files:

- `CHANGELOG.md`
- `manifest.json`
- `versions.json`
- `package.json`
- `package-lock.json`

Commit message: `Release <version>` (plain, no trailing Co-Authored-By line).

### Step 9 — Tag and push

```
git tag -a v<version> -m "v<version>"
git push origin master --tags
```

After pushing, Claude reports the workflow URL
(`https://github.com/kalinichenko88/obsidian-budget-planner-plugin/actions`)
so the user can watch the run.

### Abort behavior

If any step **after Step 6** fails (commit hook, push rejection, tag
collision), Claude stops and reports what happened. The user decides whether
to recover manually or reset. Claude does **not** auto-rollback — destructive
git operations stay explicit and user-driven.

## `release.yml` changes

Three edits to `.github/workflows/release.yml`. The `quality` job, the
master-branch tag check, Node setup, cache, `npm ci`, and `npm run build`
are unchanged.

### Edit 1 — Extract release notes from `CHANGELOG.md`

New step, runs after `npm run build`:

```yaml
- name: Extract release notes
  run: |
    tag="${GITHUB_REF#refs/tags/}"
    version="${tag#v}"
    awk -v ver="$version" '
      $0 ~ "^## \\[" ver "\\]" { found = 1; next }
      found && /^## \[/ { exit }
      found && /^\[[^]]+\]: / { exit }
      found { print }
    ' CHANGELOG.md > release-notes.md

    if [ ! -s release-notes.md ]; then
      echo "::error::No CHANGELOG.md entry found for version $version"
      exit 1
    fi
```

How the awk works:

1. A line matching `^## [<version>]` sets the `found` flag and is itself
   skipped (the header is not part of the body).
2. Once `found` is set, the next `## [` header (the previous version) stops
   extraction.
3. A line starting with `[anything]: ` (the compare-link block at the file
   bottom) also stops extraction — this protects the case where the section
   is the only one in the file.
4. Otherwise, lines are printed.

The resulting `release-notes.md` contains the bullet body of the current
version, ready for `gh release create`. An empty file fails the job loudly
to catch "I forgot to update `CHANGELOG.md`" mistakes before publishing.

### Edit 2 — Use the extracted notes in `gh release create`

Replace the existing release step:

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

Changes: `--notes-file release-notes.md` added; `--draft` removed
(auto-publish).

### Edit 3 — Nothing else

`quality` job, master-branch check, Node setup, cache, `npm ci`, and
`npm run build` stay exactly as they are.

## Recovery

If extraction fails (empty notes file), the workflow fails *before* touching
GitHub's release API — no partial release is created. The tag is still
pushed (the workflow runs *on* the tag), so to recover: delete the remote
tag (`git push --delete origin v<version>`), fix `CHANGELOG.md`, and re-run
`/release`.

If the push itself fails after the commit is made, the repo is left with a
local `Release <version>` commit and a local `v<version>` tag. The user
diagnoses the push failure and retries manually; Claude does not auto-clean.

## Out of scope

- **Backfill of past `CHANGELOG.md` entries** for `1.0.0`–`1.2.0`. The file
  starts fresh at the first release cut with the new flow. Backfilling can
  be done as a separate one-shot task later without affecting the
  automation.
- **Pre-release / beta tagging.** Only `vX.Y.Z` stable tags.
- **Automatic rollback** of failed releases. All recovery is manual.
- **Contributor/PR references** in entries. Compare links at the bottom are
  the only navigational aid.

## Acceptance criteria

- Running `/release X.Y.Z` on a clean `master` with fetched state produces:
  a new `## [X.Y.Z] - <date>` section in `CHANGELOG.md`, a new
  `[X.Y.Z]: ...compare/v<prev>...v<new>` link at the bottom, bumped versions
  in all four manifest files, a `Release X.Y.Z` commit, a `vX.Y.Z` tag, and
  a successful push.
- The GitHub workflow triggered by the tag extracts exactly the bullet body
  of the new section and publishes a non-draft release with that body and
  the `main.js` / `manifest.json` assets.
- Running `/release` from the wrong branch, with a dirty tree, stale
  `master`, a duplicate tag, or an empty commit range aborts at Step 1–3
  without mutating anything.
- `scripts/release` no longer exists; `docs/release-process.md` describes
  the new flow.
