// The discovery rule, in one place because every check here reads it and a
// second copy would drift from this one.
// A SKILL.md at the target means the target is one skill; otherwise walk down
// and stop the descent at each SKILL.md found, so a SKILL.md quoted inside a
// skill is part of that skill rather than a second one. Symlinks are followed
// because an agent's own skills directory is a directory of them pointing into
// the canonical tree; realpath bounds the cycles that follow. Dot-directories
// are skipped.
const fs = require("fs"), path = require("path");

function collect(dir, found, seen) {
  let real;
  try { real = fs.realpathSync(dir); } catch { return; }
  if (seen.has(real)) return;
  seen.add(real);
  let entries;
  try { entries = fs.readdirSync(dir).sort(); } catch { return; }
  if (entries.includes("SKILL.md")) { found.push(dir); return; }
  for (const e of entries) {
    if (e.startsWith(".")) continue;
    const p = path.join(dir, e);
    try { if (!fs.statSync(p).isDirectory()) continue; } catch { continue; }
    collect(p, found, seen);
  }
}

// Returns one entry per skill: `rel` is the path relative to the target and is
// "" when the target is itself a skill, `name` is the directory's own name, and
// `dir` and `skill` are absolute, so a caller reads them without knowing where
// the walk stood. Two plugins can each ship a skill called review, so a caller
// identifying one uses `rel`; the frontmatter carries the directory's own name,
// so a caller comparing against it uses `name`.
function skills(target) {
  const cwd = process.cwd();
  process.chdir(target || ".");
  const root = process.cwd();
  const dirs = [];
  collect(".", dirs, new Set());
  process.chdir(cwd);
  return {
    root,
    skills: dirs.map(d => {
      const rel = path.relative(".", d);
      const abs = path.resolve(root, rel);
      return { rel, name: rel ? path.basename(rel) : path.basename(root), dir: abs, skill: path.join(abs, "SKILL.md") };
    }),
  };
}

module.exports = { skills };
