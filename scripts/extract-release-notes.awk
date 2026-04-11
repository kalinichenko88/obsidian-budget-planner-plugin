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
