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
   - Tags `vX.Y.Z` and pushes `master` and the tag (two separate commands — legacy non-`v` tags are intentionally not pushed)

6. GitHub Actions takes over:
   - Runs quality checks (lint, typecheck, tests)
   - Builds the plugin
   - Extracts the new version's section from `CHANGELOG.md`
   - Publishes a non-draft GitHub release with that section as the body and `main.js` + `manifest.json` as assets

## Recovery

If the workflow fails (e.g., extraction returned nothing because `CHANGELOG.md` wasn't updated correctly), the commit, local tag, and possibly the remote tag already exist. **Do not re-run `/release`** — its pre-flight will abort because `versions.json` already contains the version.

Instead, recover manually:

1. Fix `CHANGELOG.md` on `master` (edit, stage, commit — e.g., `git commit -m "Fix changelog for X.Y.Z"`).
2. Delete the old tag locally and remotely:

   ```
   git push --delete origin vX.Y.Z
   git tag --delete vX.Y.Z
   ```

3. Recreate the tag on the fixed commit and push it:

   ```
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin master
   git push origin vX.Y.Z
   ```

4. The release workflow will trigger again on the re-pushed tag and succeed.

If the release was already published on GitHub with empty/bad notes, edit the release body manually with `gh release edit vX.Y.Z --notes-file <path>` after fixing `CHANGELOG.md`.

## Key files

- `.claude/commands/release.md` — the slash command prompt that drives the flow
- `scripts/extract-release-notes.awk` — awk program that extracts one version's body from `CHANGELOG.md`
- `scripts/version-bump.js` — updates the four version files
- `.github/workflows/release.yml` — CI release workflow
