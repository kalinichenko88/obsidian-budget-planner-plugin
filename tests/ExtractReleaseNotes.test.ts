import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const awkScript = resolve(here, '..', 'scripts', 'extract-release-notes.awk');

function extractNotes(changelog: string, version: string): string {
  const result = spawnSync('awk', ['-v', `ver=${version}`, '-f', awkScript], {
    input: changelog,
    encoding: 'utf8',
  });
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
  '[1.2.2]: https://github.com/kalinichenko88/obsidian-budget-planner-plugin/compare/1.2.1...1.2.2',
  '[1.2.1]: https://github.com/kalinichenko88/obsidian-budget-planner-plugin/compare/1.2.0...1.2.1',
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
  '[1.0.0]: https://github.com/kalinichenko88/obsidian-budget-planner-plugin/compare/ROOT...1.0.0',
  '',
].join('\n');

// Exact shape the /release slash command writes on the first-ever run
// (Case A in .claude/commands/release.md Step 6). This test protects the
// contract between the slash command and the awk extractor.
const firstRunCaseA = [
  '# Changelog',
  '',
  'All notable changes to this project are documented here.',
  '',
  'The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),',
  'and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).',
  '',
  '## [1.2.1] - 2026-04-11',
  '',
  '### Fixed',
  '- Budget block insertion now leaves a clean blank line below.',
  '',
  '### Under the hood',
  '- Upgraded build tooling and refreshed core dependencies.',
  '',
  '[1.2.1]: https://github.com/kalinichenko88/obsidian-budget-planner-plugin/compare/1.2.0...1.2.1',
  '',
].join('\n');

describe('extract-release-notes.awk', () => {
  it('extracts the body of the newest version, stopping at the next version header', () => {
    const notes = extractNotes(twoVersions, '1.2.2');
    expect(notes).toBe(['', '### Added', '- Brand-new feature X', '', ''].join('\n'));
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
    expect(notes).toBe(['', '### Added', '- Initial release', '', ''].join('\n'));
  });

  it('returns empty output when the requested version is not present', () => {
    const notes = extractNotes(twoVersions, '9.9.9');
    expect(notes).toBe('');
  });

  it('extracts correctly from the first-run Case A header block the slash command writes', () => {
    const notes = extractNotes(firstRunCaseA, '1.2.1');
    expect(notes).toBe(
      [
        '',
        '### Fixed',
        '- Budget block insertion now leaves a clean blank line below.',
        '',
        '### Under the hood',
        '- Upgraded build tooling and refreshed core dependencies.',
        '',
        '',
      ].join('\n')
    );
  });

  it('handles dotted version numbers without regex escape issues', () => {
    // The awk uses index() rather than regex for the version match so that
    // dots in the version number are treated literally, not as "any character".
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
      '[1.2.1]: https://example.com/compare/1.2.0...1.2.1',
      '',
    ].join('\n');

    const notes = extractNotes(tricky, '1.2.1');
    expect(notes).toContain('- Real match');
    expect(notes).not.toContain('- Wrong match');
  });
});
