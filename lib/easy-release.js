const { exec } = require('child_process');
const { writeFileSync, existsSync, mkdirSync, readFileSync } = require('fs');
const { join } = require('path');
const pkg = require(join(process.cwd(), 'package.json'));
const { green, red, blue } = require('chalk');
const argv = require('minimist')(process.argv.slice(2));
const { editorSync } = require('./line-editor');
const VERSION = pkg.version;
const CHANGELOG_PATH = argv.changelogPath || 'CHANGELOG.md';
const VERSION_PATTERN_CHLOG = /^## \[?(\d+\.\d+\.\d+)/m;
const REPOSITORY_URL =
  pkg.repository && pkg.repository.url ? getRepoUrl(pkg.repository.url) : '';
const DATE = getDate();
const HEAD_PATTERN = /^## \[?(HEAD|Unreleased)\]?.+$/m;
const CONSTANTS_PATH = argv.constantPath || 'constants.js';
const VERSION_PATTERN_CONST = /\[?(\d+\.\d+\.\d+)/m;

function logError(message) {
  console.error(`${blue('[easy-realease]')} ${red(message)}`);
}
function logSuccess(message) {
  console.log(`${blue('[easy-realease]')} ${green(message)}`);
}
function getDate() {
  const date = new Date();
  let month = '' + (date.getMonth() + 1),
    day = '' + date.getDate(),
    year = date.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [day, month, year].join('-');
}
function getRepoUrl(repositoryUrl) {
  if (repositoryUrl.endsWith('.git'))
    repositoryUrl = repositoryUrl.slice(0, -4);

  repositoryUrl = repositoryUrl.replace('git+', '');

  if (repositoryUrl.includes('ssh://git@gitlab.com'))
    repositoryUrl = repositoryUrl.replace(
      'ssh://git@gitlab.com',
      'https://gitlab.com'
    );

  return repositoryUrl;
}
function declareConstVersion() {
  return `const version = "${VERSION}";`;
}
function initializeChangelog(changes) {
  const releaseHeader = `## [${VERSION}] - ${DATE}\n${changes}`;
  const HEADHeader = `## [HEAD]`;
  return `# Changelog\nCheck out this: [https://keepachangelog.com]\n\n${HEADHeader}\n\n${releaseHeader}`;
}

/**
 * Update version in constant file
 *
 * @param  {string} input             Input to be changed
 * @return {string} Updated input
 */
function updateConstantVersion(input) {
  if (!VERSION_PATTERN_CONST.test(input)) {
    logError(
      'Constant file does not have version specified, can not update it with latest version'
    );
    process.exit(1);
  }
  const previousVersion = input.match(VERSION_PATTERN_CONST)[1];
  return input.replace(previousVersion, VERSION);
}

/**
 * Update inputted changelog version
 *
 * @param  {string} input             Input to be changed
 * @return {string} Updated input
 */
function updateChangelogVersion(input, changes) {
  if (!HEAD_PATTERN.test(input)) {
    logError(
      'Changelog does not have HEAD version, can not update it with latest version'
    );
    process.exit(1);
  }
  const previousVersion = input.match(VERSION_PATTERN_CHLOG)[1];

  const releaseHeader = `## [${VERSION}]${
    REPOSITORY_URL
      ? `(${REPOSITORY_URL}/-/compare/v${previousVersion}...v${VERSION})`
      : ''
  } - ${DATE}\n${changes}`;
  const newHEADHeader = `## [HEAD]${
    REPOSITORY_URL ? `(${REPOSITORY_URL}/-/compare/v${VERSION}...HEAD)` : ''
  }`;
  return input.replace(HEAD_PATTERN, `${newHEADHeader}\n\n${releaseHeader}`);
}

function easyRelease() {
  if (!VERSION) {
    logError('Please, add version property in package.json');
    process.exit(1);
  }

  const changes = editorSync();
  writeFileSync(CHANGELOG_PATH, changes);

  const { filePath, fullPath } = parsePath(CONSTANTS_PATH);

  if (filePath && !existsSync(filePath)) {
    logSuccess(`Directory '${filePath}' does not exist. Creating...`);

    mkdirSync(filePath, { recursive: true });
  }

  if (existsSync(fullPath)) {
    try {
      const constantContent = readFileSync(fullPath, {
        encoding: 'utf-8',
      });

      logSuccess('Constant file already exist. Updating version...');
      writeFileSync(fullPath, updateConstantVersion(constantContent));
      logSuccess(`Succesfully updated '${fullPath}' with version ${VERSION}`);
    } catch (error) {
      logError(`Unable to open file ${fullPath}. Aborting...`);
      process.exit(1);
    }
  } else {
    logSuccess('Constant file does not exist. Creating...');
    writeFileSync(fullPath, declareConstVersion());
    logSuccess(`Succesfully created '${fullPath}' with version ${VERSION}`);
  }

  exec(`git add ${fullPath} ${CHANGELOG_PATH}`, (error, stdout) => {
    if (error) {
      logError('An error occurred while staging changelog and version file:\n');
      logError(error);
      process.exit(1);
    } else {
      logSuccess(`Succesfully updated changelog to the v${VERSION}`);
    }

    // Commit changes
    exec(
      `git commit --amend -m '[easy-release] Updated to version: ${VERSION}'`,
      (error, stdout) => {
        if (error) {
          logError(
            `An error occurred while trying to commit updated files related to version: ${VERSION}:\n`
          );
          logError(error);
          process.exit(1);
        } else {
          logSuccess(
            `Succesfully committed updated files related to version ${VERSION}`
          );
        }
      }
    );
  });
}

if (require.main === module) easyRelease();

module.exports = {
  easyRelease,
};

function cleanPath(path) {
  return path.replace('./', '');
}

function parsePath(path) {
  const cleanedPath = cleanPath(CONSTANTS_PATH);

  const lastSlashIndex = cleanedPath.lastIndexOf('/');

  const fileName =
    lastSlashIndex === -1
      ? cleanedPath
      : cleanedPath.substr(lastSlashIndex + 1);

  const filePath =
    lastSlashIndex === -1 ? '' : cleanedPath.substr(0, lastSlashIndex);

  const fullPath = filePath ? `${filePath}/${fileName}` : cleanedPath;

  return { fileName, filePath, fullPath };
}
