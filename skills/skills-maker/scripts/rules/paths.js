// What the path rules in workflows/check.md share: which spans name a file,
// where a named file is resolved from, and the one answer both path rules give
// to a `~/` span. The span predicate and the resolution bases are taken from
// plugins/gh-solo/skills/pr-flow/scripts/docs-check.py, which has decided the
// same question for one tree since before these rules existed; read that script
// rather than this file when the two disagree.
import fs from "node:fs";
import path from "node:path";

// A span carrying any of these names nothing on disk: a glob or template
// marker, a pipe, a URL scheme, a space, or a parent reference.
const NOT_A_PATH = ["$", "*", "{", "}", "<", ">", "|", "://", " ", ".."];

const PATHY_SUFFIXES = [
  ".md", ".py", ".sh", ".fish", ".bash", ".json", ".toml", ".yaml", ".yml",
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".rb", ".rs", ".go", ".txt",
  ".cfg", ".ini", ".lock", ".sql", ".css", ".html",
];

// The agreement the two path rules are written to keep, stated once here so
// neither carries its own copy: a `~/` span is portable, and it names a file on
// the author's machine that no checkout can resolve. So skill-portable-paths
// passes it and skill-referenced-paths skips it.
export const isHomeRelative = (span) => span.startsWith("~/");

// Absolute to one machine, which is the case skill-portable-paths exists to
// catch. A drive letter counts: a skill written on Windows breaks on Linux the
// same way.
export const ABSOLUTE_TO_ONE_MACHINE = /(?:\/home\/|\/Users\/|[A-Za-z]:[\\/])[^\s`"'()[\]]*/g;

// docs-check.py's looks_like_path. The leading-slash reject is its deliberate
// blind spot, which drops slash commands and absolute paths together; that is
// why skill-portable-paths matches on its own regex above rather than asking
// this predicate about a span it refuses to look at.
export function looksLikePath(span) {
  if (NOT_A_PATH.some((bad) => span.includes(bad))) return false;
  if (/^[-#@/]/.test(span)) return false;
  if (span.endsWith("/")) return true;
  return PATHY_SUFFIXES.some((suffix) => span.endsWith(suffix));
}

// The skill a file belongs to, which is the first resolution base. It walks up
// from the file's own directory, where enclosingSkill in skill-layout.js walks
// from the grandparent: that one answers which skill contains this skill, and
// a SKILL.md's own directory is the answer wanted here. The walk stops at the
// target so a run over one skill never resolves a span against a tree outside
// it, and containment is tested on path segments rather than on the string,
// which would put /a/bc inside /a/b.
export function owningSkill(file, root) {
  const stop = path.resolve(root);
  const prefix = stop.endsWith(path.sep) ? stop : stop + path.sep;
  let dir = path.dirname(path.resolve(file));
  while (dir === stop || dir.startsWith(prefix)) {
    if (fs.existsSync(path.join(dir, "SKILL.md"))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}

// docs-check.py resolves against the owning skill, the file's own directory and
// the target root, and a span that exists under any of them resolves. The
// trailing slash is stripped first, and a directory satisfies the test as a
// file does.
export function resolves(span, file, root) {
  const bases = [owningSkill(file, root), path.dirname(path.resolve(file)), path.resolve(root)];
  const candidate = span.replace(/\/+$/, "");
  return bases.some((base) => base && fs.existsSync(path.join(base, candidate)));
}
