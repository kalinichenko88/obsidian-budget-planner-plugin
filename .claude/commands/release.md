---
description: Cut a new release — draft a CHANGELOG.md entry, bump versions, tag, and push
model: sonnet
---

You are running the release flow for a version provided as `$ARGUMENTS`. Execute the following steps in order. **Stop immediately on any failure and clearly report what went wrong. Do not auto-rollback destructive git operations — the user will decide how to recover.**

Throughout these instructions, `<version>` is the value the user passed as `$ARGUMENTS` (e.g., `1.2.1`), and `<prev-tag>` is the previous semver tag discovered in Step 2. Tags in this repo are unprefixed (`1.2.1`, not `v1.2.1`) to stay consistent with the existing release history.

The repository is `kalinichenko88/obsidian-budget-planner-plugin`.

## Step 1 — Pre-flight checks

All of these must pass before any mutation. If any fails, stop and report which check failed and why.

1. `$ARGUMENTS` must contain exactly one token matching `^\d+\.\d+\.\d+$`. If not, report usage: `/release X.Y.Z` and stop.
2. `git rev-parse --abbrev-ref HEAD` must output `master`.
3. `git status --porcelain` must be empty (clean working tree, no staged or unstaged changes).
4. `git fetch origin master`, then `git rev-parse HEAD` must equal `git rev-parse origin/master` (local master is up to date with remote).
5. `git rev-parse --verify <version>` must **fail** (tag does not exist locally).
6. `git ls-remote --tags origin <version>` must return empty (tag does not exist on the remote).
7. Read `versions.json` and confirm `<version>` is not already a key.

## Step 2 — Find the previous release

Run: `git describe --tags --abbrev=0 --match '[0-9]*.[0-9]*.[0-9]*' HEAD`

- If it succeeds, its output is `<prev-tag>` (e.g., `1.2.0`).
- If it fails with "No names found" (no semver tag exists yet — only possible in a brand-new repo), set `<prev-tag>` to empty. In that case, use `git rev-list --max-parents=0 HEAD | head -1` to get the root commit SHA for later compare-link construction.

The `--match '[0-9]*.[0-9]*.[0-9]*'` filter matches semver tags like `1.2.0`, `10.0.1`, etc., and ignores any non-semver tags (feature markers, debug tags, etc.) that might appear in the repo.

## Step 3 — Gather commits

If `<prev-tag>` is non-empty:

```
git log <prev-tag>..HEAD --format='=====%n%H%n%s%n%b'
```

Otherwise (brand-new repo, no prior semver tag):

```
git log HEAD --format='=====%n%H%n%s%n%b'
```

If the resulting output is empty, report "No commits since `<prev-tag>`" and stop — **do not release an empty version**.

## Step 4 — Draft the CHANGELOG.md entry

Classify each commit by its conventional-commit prefix:

| Prefix                                                      | Group                                    |
| ----------------------------------------------------------- | ---------------------------------------- |
| `feat`                                                      | Added                                    |
| `fix`                                                       | Fixed                                    |
| `perf`                                                      | Changed                                  |
| `refactor`, `chore`, `style`, `docs`, `test`, `build`, `ci` | Under the hood                           |
| No recognized prefix                                        | Pick the best fit by reading the subject |

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

**Format guardrail:** the release workflow extracts the new section from `CHANGELOG.md` by matching the literal `## [<version>] ` header and the `### Added` / `### Changed` / `### Fixed` / `### Under the hood` group headings. If the user's edits change the section header (e.g., `## 1.2.1 (2026-04-11)` instead of `## [1.2.1] - 2026-04-11`) or remove the group-heading structure, rewrite the intent back into the canonical format before proceeding. Free-form bullet text inside each group is fine; the headers are not.

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

[<version>]: https://github.com/kalinichenko88/obsidian-budget-planner-plugin/compare/<prev-tag>...<version>
```

If `<prev-tag>` was empty in Step 2, use the root commit SHA from Step 2 in place of `<prev-tag>` in the compare URL.

### Case B: File exists

1. Insert the approved entry immediately after the header block (the lines `# Changelog`, the description paragraph, the blank line that follows), **above** the previous latest version's `## [...]` section.
2. Append one new line to the compare-link block at the bottom of the file:

   ```
   [<version>]: https://github.com/kalinichenko88/obsidian-budget-planner-plugin/compare/<prev-tag>...<version>
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
git tag -a <version> -m "<version>"
git push origin master
git push origin <version>
```

Push `master` and the new tag as **two separate commands**, not `git push --tags`. Using targeted pushes prevents any local-only tags (test markers, debug tags) from accidentally being published.

After both pushes succeed, report to the user:

> Released `<version>`. Watch the workflow at https://github.com/kalinichenko88/obsidian-budget-planner-plugin/actions

## Failure handling

If any command fails at any step, stop and report:

- Which step failed
- The exact command and its error output
- The current repo state (is there a new commit? a local tag? was anything pushed?)

Do **not** auto-revert commits, delete tags, or force-push. The user will decide how to recover.

### Recovery hints by step

- **Step 8 (`git commit`) fails** (e.g., hook rejected the commit): fix the underlying issue, re-stage any auto-modified files, and re-run the commit manually. Do not delete or reset — the user's edits in `CHANGELOG.md` and the bumped version files are still on disk.
- **Step 9 tag creation (`git tag -a`) fails**: extremely unlikely after passing pre-flight, but if it does, report and stop. The commit from Step 8 is already made.
- **Step 9 `git push origin master` fails** (e.g., branch protection or network): the commit and tag exist locally but nothing is on the remote. Recovery path: resolve the underlying issue, then the user can re-run the two push commands manually (`git push origin master && git push origin <version>`). Do **not** re-run `/release` — Step 1 will fail because the working tree has advanced past `origin/master`.
- **Step 9 `git push origin master` succeeds but `git push origin <version>` fails**: master is published but the workflow won't trigger until the tag is pushed. Recovery: `git push origin <version>` manually once the issue is fixed.
