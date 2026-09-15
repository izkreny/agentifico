// The span predicate and the resolution bases are taken from plugins/gh-solo/skills/pr-flow/scripts/docs-check.py, which is read rather than this file when it and this file disagree.
import fs from "node:fs";
import path from "node:path";

const NOT_A_PATH = ["$", "*", "{", "}", "<", ">", "|", "://", " ", ".."];

const PATHY_SUFFIXES = [
  ".md",
  ".py",
  ".sh",
  ".fish",
  ".bash",
  ".json",
  ".toml",
  ".yaml",
  ".yml",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".rb",
  ".rs",
  ".go",
  ".txt",
  ".cfg",
  ".ini",
  ".lock",
  ".sql",
  ".css",
  ".html",
];

// A `~/` span is portable and names a file no checkout can resolve, so skill-portable-paths passes it and skill-referenced-paths skips it.
export const isHomeRelative = (span) => span.startsWith("~/");

// The lookbehind guards the whole alternation because a URL reaches both branches: `https://` carries a letter, a colon and a slash, and a URL path can carry /home/.
export const ABSOLUTE_TO_ONE_MACHINE = /(?<![A-Za-z0-9._~-])(?:\/home\/|\/Users\/|[A-Za-z]:[\\/])[^\s`"'()[\]]*/g;

// The leading-slash reject is docs-check.py's deliberate blind spot, which is why skill-portable-paths matches on its own regex rather than asking this predicate.
export function looksLikePath(span) {
  if (NOT_A_PATH.some((bad) => span.includes(bad))) return false;
  if (/^[-#@/]/.test(span)) return false;
  // A drive letter is an absolute path wearing another shape, which is skill-portable-paths' to report.
  if (/^[A-Za-z]:[\\/]/.test(span)) return false;
  if (span.endsWith("/")) return true;
  return PATHY_SUFFIXES.some((suffix) => span.endsWith(suffix));
}

// The walk stops at the target so a run over one skill never resolves a span against a tree outside it, and containment is tested on path segments because a string test puts /a/bc inside /a/b.
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

export function resolves(span, file, root) {
  const bases = [owningSkill(file, root), path.dirname(path.resolve(file)), path.resolve(root)];
  const candidate = span.replace(/\/+$/, "");
  return bases.some((base) => base && fs.existsSync(path.join(base, candidate)));
}
