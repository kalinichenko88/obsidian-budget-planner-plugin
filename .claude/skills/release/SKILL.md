---
name: release
description: >-
  Cut and publish a new release of the Budget Planner Obsidian plugin. Use this
  WHENEVER the user wants to release, publish, ship a new version, bump the
  version, cut a tag, or add a CHANGELOG entry — even a bare "release" or "let's
  ship 1.3.0". Drives the whole local side: derive the next semver from the
  commits, draft the CHANGELOG section, bump the version files, run the full
  verification gate, commit, and (only after explicit confirmation) tag and push
  — the tag push triggers the GitHub Actions release workflow. Then watch CI and
  report the published release.
---

# Releasing budget-planner

## How releasing works here

Publishing is **tag-driven and runs in CI**: `.github/workflows/release.yml` fires
on any `[0-9]*.[0-9]*.[0-9]*` tag push, re-runs the quality workflow, builds, and
creates a GitHub Release with `main.js`, `manifest.json`, and a
`budget-planner-<tag>.zip`.

Tags in this repo are **unprefixed** (`1.2.5`, not `v1.2.5`) — stay consistent
with the existing history.

Two invariants this skill exists to protect:

1. **`manifest.json`'s version === the tag name.** Obsidian's community-plugin
   auto-updater and BRAT read the version out of the attached `manifest.json`, not
   the tag. If they drift, users get the wrong version.
2. **`CHANGELOG.md` contains a `## [<version>] ` section before the tag is pushed.**
   `scripts/extract-release-notes.awk` matches that literal header (with the
   trailing space, so `1.2.1` doesn't match `1.2.10`) and stops at the next `## [`
   or at the compare-link block. Empty extraction **fails the release job**.

The repository is `kalinichenko88/obsidian-budget-planner-plugin`.

Everything the CI does _not_ do is your job: pick the version, write the
changelog, bump the four version files, **prove the build is green locally**,
commit, and — after an explicit confirmation, because the tag push publishes a
GitHub Release — push the tag.

**Why the local gate matters:** CI runs quality checks _after_ the tag exists. A
red build there leaves a pushed tag with no release. Verifying locally first means
a broken tree never becomes a tag.

## Preconditions — check before doing anything

```sh
git rev-parse --abbrev-ref HEAD        # expect: master
git status --porcelain                 # expect: empty
git fetch origin master --tags
git rev-parse HEAD                     # must equal git rev-parse origin/master
```

- **Not on `master`** → stop; ask the user to switch.
- **Dirty tree** → stop; the release commit must contain only the bump + changelog.
- **Behind/ahead of `origin/master`** → stop; ask the user to pull or push first.

## Step 1 — Gather state

```sh
node -e "console.log(require('./manifest.json').version)"       # current version
LAST_TAG="$(git describe --tags --abbrev=0 --match '[0-9]*.[0-9]*.[0-9]*' HEAD)"
git log "$LAST_TAG"..HEAD --no-merges --format='=====%n%H%n%s%n%b'
```

- **`git describe` fails with "No names found"** (brand-new repo) → treat as first
  release: use `git log HEAD --no-merges --format='=====%n%H%n%s%n%b'` and use the
  root commit SHA (`git rev-list --max-parents=0 HEAD | head -1`) in the
  compare link.
- **No commits since `$LAST_TAG`** → **stop**: nothing to release. Never cut an
  empty version.

The `--match` filter keeps non-semver tags (feature markers, debug tags) out of
the lookup.

## Step 2 — Propose the version (user confirms)

If the user passed an explicit `X.Y.Z`, use it — but still validate it against the
rules below and say so if it disagrees.

Otherwise classify the commits by conventional-commit prefix and show your
reasoning ("2 feat, 1 fix, no breaking → minor → 1.3.0"):

- breaking (`feat!` / `fix!` / `BREAKING CHANGE:`) → **major**
- `feat:` → **minor**
- only `fix` / `perf` / `refactor` / `docs` / `chore` / `style` / `test` / `build` / `ci` → **patch**

State the proposed version explicitly and get a yes (or an override) before editing.

Then verify it's actually free:

```sh
git rev-parse --verify <version>              # must FAIL (no local tag)
git ls-remote --tags origin <version>         # must be empty
node -e "if(require('./versions.json')['<version>'])process.exit(1)"   # must pass
```

## Step 3 — Draft the CHANGELOG section (user approves)

Group commits into these sections, in this order, **omitting any that are empty**:

| Prefix                                                      | Group                           |
| ----------------------------------------------------------- | ------------------------------- |
| `feat`                                                      | Added                           |
| `perf`                                                      | Changed                         |
| `fix`                                                       | Fixed                           |
| `refactor`, `chore`, `style`, `docs`, `test`, `build`, `ci` | Under the hood                  |
| no recognized prefix                                        | best fit by reading the subject |

```markdown
## [<version>] - <YYYY-MM-DD>

### Added

- ...

### Fixed

- ...

### Under the hood

- ...
```

- Date from `date -u +%Y-%m-%d` — don't guess it.
- Rewrite each commit as a **short user-facing sentence**; never paste the commit
  subject verbatim. The reader is deciding whether to update the plugin.
- Collapse **all** "Under the hood" commits into **one** high-level bullet
  (e.g. "Upgraded build tooling and refreshed core dependencies").
- Match the voice of the existing entries in `CHANGELOG.md`.

Show the draft in a fenced block and ask:

> Does this look right, or do you want changes? I can reword bullets, merge/split
> them, or move items between groups.

Iterate until the user **explicitly** approves. Free-form bullet text is fine, but
if their edits break the `## [<version>] - <date>` header or the `###` group
headings, rewrite the intent back into the canonical shape — that header is what
the awk extractor matches, and a miss fails the release job.

## Step 4 — Apply edits

1. **`CHANGELOG.md`** — insert the approved section directly after the header
   block (title, description paragraph, blank line), **above** the previous
   `## [...]` section. Then add the compare link at the **top** of the link block
   at the bottom of the file:

   ```
   [<version>]: https://github.com/kalinichenko88/obsidian-budget-planner-plugin/compare/<prev-tag>...<version>
   ```

2. **Version files:**

   ```sh
   node scripts/version-bump.js <version>
   ```

   Updates `manifest.json`, `versions.json`, `package.json`, `package-lock.json`.

3. **Re-read `manifest.json`** and confirm `version` is exactly the agreed string —
   this is what ships to Obsidian's updater.

## Step 5 — Verify (the CI gate, locally)

```sh
npm run lint
npm run typecheck
npm test
npm run build
awk -v ver=<version> -f scripts/extract-release-notes.awk CHANGELOG.md
```

The last one is not optional: it's the exact command CI runs, and empty output is
the one failure mode that survives every other check. If it prints nothing, the
header in Step 4 is malformed — fix it before going further.

If **any** step fails, **abort**: report which failed with its output; do not
commit, tag, or push. A red build must never become a tag.

## Step 6 — Commit

```sh
git add CHANGELOG.md manifest.json versions.json package.json package-lock.json
git commit -m "Release <version>"
```

Plain `Release <version>` — **no Co-Authored-By trailer**. `dist/` is gitignored;
never staged.

## Step 7 — Tag and push (explicit confirmation required)

This is the irreversible step. **Before pushing, ask the user to confirm in plain
terms**, e.g.: "Ready to publish `<version>`? Pushing the tag triggers the release
workflow and creates a public GitHub Release. Proceed?"

Only after an explicit yes:

```sh
SHA="$(git rev-parse HEAD)"          # remember the release commit for Step 8
git tag -a <version> -m "<version>"
git push origin master
git push origin <version>            # ← triggers release.yml
```

Two separate pushes, **never `git push --tags`** — targeted pushes keep local-only
tags (test markers, debug tags) from leaking to the remote.

## Step 8 — Watch CI

Select the run **by the tagged commit's SHA, not `--limit=1`** — the most recent
run may be a previous green release whose watch returns 0 instantly.

```sh
RUN=""
while [ -z "$RUN" ]; do
  RUN="$(gh run list --workflow=release.yml --json databaseId,headSha \
    --jq ".[] | select(.headSha==\"$SHA\") | .databaseId" | head -1)"
  [ -z "$RUN" ] && sleep 5
done
gh run watch --exit-status "$RUN"
```

- **On success** → report the version and the Release URL
  (`gh release view <version> --json url --jq .url`).
- **On failure** → surface the failing log (`gh run view "$RUN" --log-failed`) and
  follow the recovery below. **Never retag a different commit under the same
  version once the Release exists** — edit the release or cut the next patch.

## Failure handling

On any failure, stop and report: which step, the exact command and its output, and
the current repo state (is there a new commit? a local tag? was anything pushed?).

Do **not** auto-revert commits, delete tags, or force-push. The user decides how to
recover.

### Recovery hints

- **Step 6 `git commit` fails** (hook rejected it): fix the cause, re-stage any
  auto-modified files, re-run the commit. Nothing is lost — the changelog edits and
  bumped files are on disk.
- **Step 7 `git push origin master` fails**: commit and tag exist locally, nothing
  is on the remote. Fix the cause, then re-run the two pushes manually. Do **not**
  re-run this skill — its preconditions will fail because the tree has advanced
  past `origin/master`.
- **`git push origin master` succeeded, tag push failed**: master is published but
  the workflow won't fire. Just `git push origin <version>` once fixed.
- **Step 8 CI failed at "Extract release notes"**: `CHANGELOG.md` on `master` has no
  matching section (Step 5's awk check should have caught this). Fix the changelog,
  commit, then move the tag:

  ```sh
  git push --delete origin <version>
  git tag --delete <version>
  git tag -a <version> -m "<version>"
  git push origin master && git push origin <version>
  ```

- **The Release was published with bad notes**: fix `CHANGELOG.md`, then
  `gh release edit <version> --notes-file <path>` — don't retag.
