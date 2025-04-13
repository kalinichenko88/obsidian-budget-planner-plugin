import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';

function validateVersion(version) {
  const regex = /^\d+\.\d+\.\d+$/;
  return regex.test(version);
}

const [, , targetVersion] = process.argv;

if (validateVersion(targetVersion) === false) {
  console.error('Invalid version format. Please use x.x.x');
  process.exit(1);
}

(async function main() {
  const writeProcesses = [];

  // read minAppVersion from manifest.json and bump version to target version
  let manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
  const { minAppVersion } = manifest;
  if (manifest.version === targetVersion) {
    console.error('Version already set to target version');
    process.exit(0);
  }
  manifest.version = targetVersion;
  writeProcesses.push(writeFile('manifest.json', JSON.stringify(manifest, null, '  ') + '\n'));

  // update versions.json with target version and minAppVersion from manifest.json
  let versions = JSON.parse(readFileSync('versions.json', 'utf8'));
  if (Object.keys(versions).includes(targetVersion)) {
    console.warn('Version already exists in versions.json');
  }
  versions[targetVersion] = minAppVersion;
  writeProcesses.push(writeFile('versions.json', JSON.stringify(versions, null, '  ') + '\n'));

  // update package.json with target version
  let packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  if (packageJson.version === targetVersion) {
    console.error('Version already set to target version');
    process.exit(0);
  }
  packageJson.version = targetVersion;
  writeProcesses.push(writeFile('package.json', JSON.stringify(packageJson, null, '  ') + '\n'));

  // update package-lock.json with target version
  let packageLockJson = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  if (packageLockJson.version === targetVersion) {
    console.error('Version already set to target version');
    process.exit(0);
  }
  packageLockJson.version = targetVersion;
  writeProcesses.push(
    writeFile('package-lock.json', JSON.stringify(packageLockJson, null, '  ') + '\n')
  );

  await Promise.all(writeProcesses);

  console.info('Version bump completed successfully');
  console.info(`Version bumped to ${targetVersion} and minAppVersion set to ${minAppVersion}`);
})().catch((error) => {
  console.error('Error bumping version:', error);
  process.exit(1);
});
