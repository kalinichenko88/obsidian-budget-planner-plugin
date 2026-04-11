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
      '[1.2.1]: https://example.com/compare/v1.2.0...v1.2.1',
      '',
    ].join('\n');

    const notes = extractNotes(tricky, '1.2.1');
    expect(notes).toContain('- Real match');
    expect(notes).not.toContain('- Wrong match');
  });
});
