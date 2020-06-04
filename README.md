# Easy Release

## Install

```bash
npm install --save-dev @luca_previtali/easy-release
```

## Setup

Add this script in package.json like the following example:
```
"scripts": {
    "version": "easy-release --changelogPath Changelog.md --constantPath src/Constant.js"
  }
```

This script can take two optional params:
- changelogPath: path to changelog file
- constantPath: path to Js file

If changelog or constant files not exist a new ones will be created.

## Usage

When you are ready to package a new version of your app simply launch

```
npm version [major | minor | patch] -m 'Optional commit for new release'
```

After update your package.json version, the script will ask you the changes of the new version that will be added at changelog file.
After updated your desidered Js file and Changelog npm create a git release commit and the version tag.

## Want more explanations?

For more info see [https://docs.npmjs.com/cli/version]