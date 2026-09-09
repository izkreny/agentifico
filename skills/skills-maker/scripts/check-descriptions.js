// Raw-line sweep over every skill's frontmatter description.
// Usage: node check-descriptions.js [target]   (defaults to the current directory)
// The target is one skill's own directory, a directory of skills, or a package
// root whose skills sit further down - a plugin's at <root>/skills/.
// A real YAML parser cannot replace this: the silent traps are valid YAML.
const fs = require("fs");
const { skills } = require("./walk.js");
const { root, skills: found } = skills(process.argv[2]);
// The name is the path relative to the target, not the basename: two plugins
// can each ship a skill called review.
const targets = found.map(s => [s.rel || s.name, s.skill]);
let defects = 0;
for (const [s, p] of targets) {
  const m = fs.readFileSync(p, "utf8").match(/^---\n([\s\S]*?)\n---/);
  const fm = m ? m[1] : "", bad = [];
  const dl = fm.split("\n").filter(l => l.startsWith("description:"));
  if (!dl.length) bad.push("no description: never advertised");
  if (dl.length > 1) bad.push("duplicate description key: last silently wins");
  const raw = (dl[0] || "").slice(12).trim();
  const block = dl.length && /^[|>][+-]?$/.test(raw);
  // Only a value that opens with a curly quote is pretending to be quoted; a
  // typographic apostrophe inside a value is harmless, and a block scalar is
  // immune to the whole family, so neither is a defect.
  if (!block && /^[“”‘’]/.test(raw)) bad.push("curly quotes are not YAML quotes");
  if (block) {
    // block scalar: immune to every trap below
  } else if (raw.startsWith("\"")) {
    const body = raw.slice(1, -1);
    if (!raw.endsWith("\"") || raw.length < 2) bad.push("unclosed double quote: parse error");
    else {
      if (/\\(?![\\"nt])/.test(body)) bad.push("risky backslash escape in double quotes");
      if (/(^|[^\\])"/.test(body)) bad.push("unescaped inner double quote: parse error");
    }
  } else if (raw.startsWith("'")) {
    if (((raw.match(/'/g) || []).length) % 2 !== 0) bad.push("odd apostrophe count: parse error");
  } else if (dl.length) {
    const cut = raw.search(/\s#/);
    if (cut >= 0) bad.push("TRUNCATED at ' #', silently loses " + (raw.length - cut) + " chars");
    if (/^[&*!\[{%@]/.test(raw)) bad.push("leading " + raw[0] + " changes meaning or is a parse error");
    if (/:(\s|$)/.test(raw)) bad.push("colon inside or ending an unquoted value: parse error");
    if (/^(yes|no|on|off|true|false|null|~)$/i.test(raw)) bad.push("becomes boolean or null in some parsers");
  }
  if (bad.length) defects++;
  console.log(s.padEnd(30) + (bad.length ? bad.join("; ") : "ok"));
}
// Checking nothing is a failure, not a pass: a target with no SKILL.md under it
// is a wrong target, and silence there reads exactly like a clean sweep.
if (!targets.length) console.log("no SKILL.md found in " + root + ": nothing was checked");
else console.log(targets.length + " skill(s) checked, " + defects + " with defects");
process.exitCode = (defects || !targets.length) ? 1 : 0;
