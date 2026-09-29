// The span predicate and the resolution bases were derived from <repo-root>/plugins/gh-solo/skills/pr-flow/scripts/docs-check.py and are kept in step where they agree, with each deliberate departure marked where it occurs.
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

// A `~/` span names a file no checkout can resolve, so skill-referenced-paths skips it; skill-portable-paths reports it in prose, where `<home-dir>/` belongs.
export const isHomeRelative = (span) => span.startsWith("~/");

export const HOME_DIR_PLACEHOLDER = /<home-dir>[^\s`"'()[\]]*/g;

// At least one character must follow the slash, because a bare `~/` names the form rather than a location, which is how the standard itself has to talk about it.
export const TILDE_PATH = /(?<![\w.~/-])(~\/[^\s`"'()[\]]+)/g;

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
