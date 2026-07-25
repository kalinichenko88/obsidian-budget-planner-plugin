# 🚀 How to release

Releases are cut by the **release skill** in Claude Code. It triggers on `/release`
or on a plain request ("let's ship a release", "bump the version").

## Prerequisites

- Clean working tree on `master`, in sync with `origin/master`.
- `gh` authenticated (the skill watches the CI run after pushing the tag).

You do **not** need to know the version number — the skill derives it.

## Flow

1. Open Claude Code in the project directory.
2. Ask for a release:

   ```
   /release          # version derived from the commits
   /release 1.3.0    # or force a specific version
   ```

3. Claude checks the preconditions, reads the commits since the last semver tag,
   and proposes the next version with its reasoning (`2 feat, 1 fix → minor →
1.3.0`). Confirm or override.
4. Claude drafts a `CHANGELOG.md` entry in user-facing English, grouped into
   **Added**, **Changed**, **Fixed**, and **Under the hood**. Review it in the chat
   and ask for rewording until it reads the way you want.
5. Approve the draft. Claude then:
   - Writes the `CHANGELOG.md` section and its compare link
   - Runs `node scripts/version-bump.js X.Y.Z` to bump `manifest.json`,
     `versions.json`, `package.json`, and `package-lock.json`
   - **Runs the full gate locally** — `lint`, `typecheck`, `test`, `build`, plus the
     awk extraction that CI depends on. Any failure aborts before anything is tagged.
   - Commits as `Release X.Y.Z`
6. Claude asks for an explicit go-ahead before the irreversible step, then tags
   `X.Y.Z` (unprefixed) and pushes `master` and the tag as two separate commands.
7. Claude watches the release workflow (selected by the release commit's SHA) and
   reports the published Release URL, or the failing log.

GitHub Actions runs quality checks, builds, extracts the new version's section from
`CHANGELOG.md`, and publishes a release with that section as the body plus
`main.js`, `manifest.json`, and `budget-planner-X.Y.Z.zip` as assets.

## Recovery

The skill never auto-reverts — it reports the failing step and the repo state, and
you decide. Its own recovery hints cover the common cases; the one worth knowing
here is a failed **"Extract release notes"** step, which means `CHANGELOG.md` on
`master` has no section matching the tag:

1. Fix `CHANGELOG.md` on `master` and commit.
2. Move the tag to the fixed commit:

   ```sh
   git push --delete origin X.Y.Z
   git tag --delete X.Y.Z
   git tag -a X.Y.Z -m "X.Y.Z"
   git push origin master && git push origin X.Y.Z
   ```

If the release was already published with bad notes, fix `CHANGELOG.md` and edit
the body in place with `gh release edit X.Y.Z --notes-file <path>` — don't retag.

## Key files

- `.claude/skills/release/SKILL.md` — the skill that drives the flow
- `scripts/extract-release-notes.awk` — extracts one version's body from `CHANGELOG.md`
- `scripts/version-bump.js` — updates the four version files
- `.github/workflows/release.yml` — CI release workflow
