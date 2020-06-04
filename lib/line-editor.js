const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");

const spawnSync = childProcess.spawnSync;

let ed = /^win/.test(process.platform) ? "notepad" : "vim";
ed = process.env.EDITOR || process.env.VISUAL || ed;

const START_TEMPLATE = "### Added\n\n### Changed\n\n### Removed\n\n";

exports.editorSync = function (option) {
  option = option || {};
  const tempFile = path.resolve("/tmp", `temp-${process.pid}${Date.now()}.tmp`);

  fs.writeFileSync(tempFile, START_TEMPLATE, "utf8");

  spawnSync(option.editor || ed, [tempFile], {
    stdio: "inherit",
  });

  const input = fs.readFileSync(tempFile, "utf8");
  fs.unlinkSync(tempFile);

  return input;
};
