// Every skill's frontmatter `name` must match its own directory.
// Usage: node check-names.js [target]   (defaults to the current directory)
// The target is one skill's own directory, a directory of skills, or a package
// root whose skills sit further down - a plugin's at <root>/skills/.
// It is a script rather than a shell loop in the docs because the loop it
// replaces produced five of the eleven findings on the pull request that added
// it, every one a quoting or word-splitting defect, and a script gets a bench.
const fs = require("fs");
const { skills } = require("./walk.js");

const { root, skills: found } = skills(process.argv[2]);
let defects = 0;
for (const s of found) {
  const fm = (fs.readFileSync(s.skill, "utf8").match(/^---\n([\s\S]*?)\n---/) || [, ""])[1];
  const line = fm.split("\n").find(l => l.startsWith("name:"));
  const declared = line === undefined ? null : line.slice(5).trim();
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
