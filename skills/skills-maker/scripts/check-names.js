// Every skill's frontmatter `name` must match its own directory.
// Usage: node check-names.js [target]   (defaults to the current directory)
// The target is one skill's own directory, a directory of skills, or a package
// root whose skills sit further down - a plugin's at <root>/skills/.
// It is a script rather than a loop in the docs because shell written as prose
// carries quoting and word-splitting hazards that nothing runs and nothing
// tests, where a script has scripts/test-checks.sh.
const fs = require("fs");
const { skills } = require("./walk.js");

// What YAML makes of the raw line, so a quoted name and a name carrying a
// trailing comment are compared by what they parse to rather than by their
// punctuation. The description check owns the membership of these traps.
function scalar(raw) {
  // A quoted value ends at its own closing quote, not at the end of the line,
  // so anything trailing it - a comment - is outside the value.
  if (raw.startsWith('"')) {
    const m = raw.slice(1).match(/^((?:[^"\\]|\\.)*)"/);
    if (m) return m[1].replace(/\\(.)/g, "$1");
  }
  if (raw.startsWith("'")) {
    const m = raw.slice(1).match(/^((?:[^']|'')*)'/);
    if (m) return m[1].replace(/''/g, "'");
  }
  // A plain scalar ends at the first ` #`, and YAML strips the space before it
  // however much there is, so the cut is trimmed rather than sliced raw.
  const cut = raw.search(/\s#/);
  return (cut >= 0 ? raw.slice(0, cut) : raw).trim();
}

const { root, skills: found } = skills(process.argv[2]);
let defects = 0;
for (const s of found) {
  const fm = (fs.readFileSync(s.skill, "utf8").match(/^---\n([\s\S]*?)\n---/) || [, ""])[1];
  const line = fm.split("\n").find(l => l.startsWith("name:"));
  const declared = line === undefined ? null : scalar(line.slice(5).trim());
  const label = s.rel || ".";
  if (declared === null) { defects++; console.log(label.padEnd(30) + "no name: nothing can match it"); }
  else if (declared !== s.name) { defects++; console.log(label.padEnd(30) + `name is ${JSON.stringify(declared)}, directory is ${JSON.stringify(s.name)}`); }
}
// Checking nothing is a failure, for the same reason as in the description
// sweep: a target with no skill under it is a wrong target, and its silence
// reads exactly like a clean sweep.
if (!found.length) console.log("no SKILL.md found in " + root + ": nothing was checked");
else console.log(found.length + " skill(s) checked, " + defects + " with defects");
process.exitCode = (defects || !found.length) ? 1 : 0;
