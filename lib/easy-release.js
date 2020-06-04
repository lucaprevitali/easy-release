const { exec } = require("child_process");
const { readFile, writeFileSync, existsSync, mkdirSync } = require("fs");
const { join } = require("path");
const pkg = require(join(process.cwd(), "package.json"));
const { green, red } = require("chalk");
const argv = require("minimist")(process.argv.slice(2));
const { editorSync } = require("./line-editor");
const VERSION = pkg.version;
const CHANGELOG_PATH = argv.changelogPath || "CHANGELOG.md";
const VERSION_PATTERN_CHLOG = /^## \[?(\d+\.\d+\.\d+)/m;
const REPOSITORY_URL =
  pkg.repository && pkg.repository.url ? getRepoUrl(pkg.repository.url) : "";
const DATE = getDate();
const HEAD_PATTERN = /^## \[?(HEAD|Unreleased)\]?.+$/m;
const CONSTANTS_PATH = argv.constantPath || "constant.js";
const VERSION_PATTERN_CONST = /\[?(\d+\.\d+\.\d+)/m;

function logError(message) {
  console.error(red(message));
}
function logSuccess(message) {
  console.log(green(message));
}
function getDate() {
  const date = new Date();
  let month = "" + (date.getMonth() + 1),
    day = "" + date.getDate(),
    year = date.getFullYear();

  if (month.length < 2) month = "0" + month;
  if (day.length < 2) day = "0" + day;

  return [day, month, year].join("-");
}
function getRepoUrl(repositoryUrl) {
  if (repositoryUrl.endsWith(".git"))
    repositoryUrl = repositoryUrl.slice(0, -4);

  repositoryUrl = repositoryUrl.replace("git+", "");

  if (repositoryUrl.includes("ssh://git@gitlab.com"))
    repositoryUrl = repositoryUrl.replace(
      "ssh://git@gitlab.com",
      "https://gitlab.com"
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
      "[easy-release] Constant file does not have version specified, can not update it with latest version"
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
      "[easy-release] Changelog does not have HEAD version, can not update it with latest version"
    );
    process.exit(1);
  }
  const previousVersion = input.match(VERSION_PATTERN_CHLOG)[1];

  const releaseHeader = `## [${VERSION}]${
    REPOSITORY_URL
      ? `(${REPOSITORY_URL}/-/compare/v${previousVersion}...v${VERSION})`
      : ""
  } - ${DATE}\n${changes}`;
  const newHEADHeader = `## [HEAD]${
    REPOSITORY_URL ? `(${REPOSITORY_URL}/-/compare/v${VERSION}...HEAD)` : ""
  }`;
  return input.replace(HEAD_PATTERN, `${newHEADHeader}\n\n${releaseHeader}`);
}

function easyRelease() {
  if (!VERSION) {
    logError("[easy-release] Please, add version property in package.json");
    process.exit(1);
  }

  const changes = editorSync();

  readFile(CONSTANTS_PATH, { encoding: "utf-8" }, (error, constantContent) => {
    if (error) {
      console.log(
        `[easy-release] Seems to be no ${CONSTANTS_PATH}, a new one is being created`
      );

      const dir = CONSTANTS_PATH.substr(0, CONSTANTS_PATH.lastIndexOf("/"));
      if (dir && !existsSync(dir)) {
        mkdirSync(dir);
      }
      writeFileSync(CONSTANTS_PATH, declareConstVersion());
    } else {
      writeFileSync(CONSTANTS_PATH, updateConstantVersion(constantContent));
    }

    exec(`git add ${CONSTANTS_PATH}`, (error, stdout) => {
      if (error) {
        logError(
          `[easy-release] An error occurred while staging updated ${CONSTANTS_PATH}:\n`
        );
        logError(error);
        process.exit(1);
      }
      logSuccess(
        `\n[easy-release] Succesfully updated constant file to the v${VERSION}`
      );
    });
  });

  readFile(CHANGELOG_PATH, { encoding: "utf-8" }, (error, changelog) => {
    if (error) {
      console.log(
        `[easy-release] Seems to be no ${CHANGELOG_PATH}, a new one is being created`
      );

      const dir = CHANGELOG_PATH.substr(0, CHANGELOG_PATH.lastIndexOf("/"));
      if (dir && !existsSync(dir)) {
        mkdirSync(dir);
      }

      writeFileSync(CHANGELOG_PATH, initializeChangelog(changes));
    } else {
      writeFileSync(CHANGELOG_PATH, updateChangelogVersion(changelog, changes));
    }

    exec(`git add ${CHANGELOG_PATH}`, (error, stdout) => {
      if (error) {
        logError(
          "[easy-release] An error occurred while staging updated changelog:\n"
        );
        logError(error);
        process.exit(1);
      }

      logSuccess(
        `\n[easy-release] Succesfully updated changelog to the v${VERSION}`
      );
    });
  });
}

if (require.main === module) easyRelease();

module.exports = {
  easyRelease,
};
