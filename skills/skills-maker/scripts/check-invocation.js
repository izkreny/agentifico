// The frontmatter fields that decide who may invoke a skill.
// Usage: node check-invocation.js [target]   (defaults to the current directory)
// The target is one skill's own directory, a directory of skills, or a package
// root whose skills sit further down - a plugin's at <root>/skills/.
// Both fields are Claude Code extensions that other agents ignore silently, so a
// skill relying on either has to state the same policy in its description, and
// that is the defect worth more than a bad value: a bad value misbehaves the
// first time it is tried, a policy held only by the field works exactly as
// intended on one agent and is wide open on every other.
const fs = require("fs");
const { skills } = require("./walk.js");
const { scalar } = require("./scalar.js");

// Each field with the value it defaults to; a field at its default relies on
// nothing, so only the other value triggers the description cross-check.
const FIELDS = { "disable-model-invocation": "false", "user-invocable": "true" };

// The description's text, whatever scalar style it uses. The traps in how it is
// quoted belong to the description check; here it is only searched.
function description(fm) {
  const lines = fm.split("\n");
  const i = lines.findIndex(l => l.startsWith("description:"));
  if (i < 0) return "";
  const raw = lines[i].slice(12).trim();
  if (!/^[|>][+-]?$/.test(raw)) return raw;
  const body = [];
  // A paragraph break inside a block scalar is an empty line, so the scalar
  // ends at the first non-empty line with no indent rather than at the first
  // line without one.
  for (let j = i + 1; j < lines.length && (lines[j] === "" || /^\s/.test(lines[j])); j++) body.push(lines[j]);
  return body.join("\n");
}

// Whether the description says anything about invocation at all: the word
// itself, spawning, or the skill's own slash command, bare or under a plugin
// prefix ending in a colon - never another skill's command that this name only
// ends or only opens, so the name is bounded on both sides by something no
// skill name contains.
// Whether what it says matches the field is the reviewer's to judge; this only
// catches the description that is silent.
function statesPolicy(text, name) {
  const slash = new RegExp("/(?:[\\w.-]+:)?" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![\\w-])");
  return /invo[ck]|spawn/i.test(text) || slash.test(text);
}

const { root, skills: found } = skills(process.argv[2]);
let defects = 0;
for (const s of found) {
  const fm = (fs.readFileSync(s.skill, "utf8").match(/^---\n([\s\S]*?)\n---/) || [, ""])[1];
  const lines = fm.split("\n"), bad = [];
  for (const [key, dflt] of Object.entries(FIELDS)) {
    const dl = lines.filter(l => l.startsWith(key + ":"));
    if (!dl.length) continue;
    if (dl.length > 1) bad.push(`duplicate ${key} key: last silently wins`);
    const raw = dl[dl.length - 1].slice(key.length + 1).trim();
    const value = scalar(raw);
    // Lowercase true and false are what every parser reads as a boolean. yes,
    // on and True are booleans in some parsers and strings in others, so a
    // policy written that way holds on some agents; a quoted value is a string
    // in every parser, whatever it spells.
    if (/^["']/.test(raw)) { bad.push(`${key} is quoted, so it is the string ${JSON.stringify(value)} rather than a boolean`); continue; }
    if (value !== "true" && value !== "false") { bad.push(`${key} is ${JSON.stringify(value)}, not true or false`); continue; }
    if (value !== dflt && !statesPolicy(description(fm), s.name)) bad.push(`${key}: ${value} is a field other agents ignore, and the description says nothing about invocation`);
  }
  if (bad.length) { defects++; console.log((s.rel || ".").padEnd(30) + bad.join("; ")); }
}
// Checking nothing is a failure, for the same reason as in the description
// sweep: a target with no skill under it is a wrong target, and its silence
// reads exactly like a clean sweep.
if (!found.length) console.log("no SKILL.md found in " + root + ": nothing was checked");
else console.log(found.length + " skill(s) checked, " + defects + " with defects");
process.exitCode = (defects || !found.length) ? 1 : 0;
