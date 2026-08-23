// Raw-line sweep over every skill's frontmatter description.
// Usage: node check-descriptions.js [skills-dir]   (defaults to the current directory)
// A real YAML parser cannot replace this: the silent traps are valid YAML.
const fs = require("fs");
if (process.argv[2]) process.chdir(process.argv[2]);
let defects = 0;
for (const s of fs.readdirSync(".").sort()) {
  const p = s + "/SKILL.md";
  if (!fs.existsSync(p)) continue;
  const m = fs.readFileSync(p, "utf8").match(/^---\n([\s\S]*?)\n---/);
  const fm = m ? m[1] : "", bad = [];
  if (/[“”‘’]/.test(fm)) bad.push("curly quotes are not YAML quotes");
  const dl = fm.split("\n").filter(l => l.startsWith("description:"));
  if (!dl.length) bad.push("no description: never advertised");
  if (dl.length > 1) bad.push("duplicate description key: last silently wins");
  const raw = (dl[0] || "").slice(12).trim();
  if (dl.length && /^[|>][+-]?$/.test(raw)) {
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
process.exitCode = defects ? 1 : 0;
