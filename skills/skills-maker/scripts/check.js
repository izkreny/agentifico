// The mechanical audit, as one command over one target: a skill's own
// directory, a directory of skills, or a package root whose skills sit further
// down, defaulting to the current directory. It runs markdownlint-cli2 with this
// package's configuration, which carries the general lint and the local rules,
// so the target may live anywhere and the rules still apply. What cli2 alone
// does not give is the one thing added here: a target with no markdown under it
// is a wrong target, and its silence reads exactly like a clean sweep, so
// linting nothing exits non-zero.
// Usage: node check.js [target]
import path from "node:path";
import { fileURLToPath } from "node:url";
import { main } from "markdownlint-cli2";

const target = path.resolve(process.argv[2] ?? ".");
const here = path.dirname(fileURLToPath(import.meta.url));
const config = path.join(here, "..", ".markdownlint-cli2.jsonc");

let linted = null;
const code = await main({
  directory: target,
  // cli2 globs with `dot: true`, so dot-directories are excluded here: an
  // agent's skills directory carries its own dot-directories, and a fixture
  // tree keeps its fixtures under one so a whole-tree sweep does not read them.
  argv: ["--config", config, "**/*.md", "#**/.*/**", "#**/node_modules/**"],
  // The layout rule stops its ancestor search at the target.
  optionsOverride: { config: { "skill-layout": { root: target } } },
  logMessage: (message) => {
    const m = /^Linting: (\d+) file/.exec(message);
    if (m) linted = Number(m[1]);
    console.log(message);
  },
  logError: (message) => console.error(message),
});

if (!linted) {
  console.log(`no markdown file found under ${target}: nothing was checked`);
  process.exit(1);
}
process.exit(code);
