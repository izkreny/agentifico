// WHY: a target may not hold the whole skill, so each SKILL.md starts a read of its tree from disk.
import fs from "node:fs";
import path from "node:path";
import { FRONTMATTER_LINE, isSkillFile } from "./frontmatter.js";

const BUNDLE_FOLDERS = new Set(["scripts", "references"]);

// WHY: a dot-named file is a tool's own configuration, and node_modules is what the skill depends on rather than what it says.
const skipped = (name) => name.startsWith(".") || name === "node_modules";

function skillFiles(skill) {
  const files = [];
  const unread = [];
  const ancestors = new Set();
  const visit = (full) => {
    try {
      const stat = fs.statSync(full, { throwIfNoEntry: false });
      // WHY: a link that resolves to nothing names nothing, and scripts/check.js reports one under its own group.
      if (stat?.isFile()) files.push(full);
      if (!stat?.isDirectory()) return;
      const real = fs.realpathSync(full);
      // WHY: only a folder this walk is already inside is a loop, while a second link to a folder is a second path an agent can be told.
      if (ancestors.has(real)) return;
      ancestors.add(real);
      for (const name of fs.readdirSync(full).filter((name) => !skipped(name))) visit(path.join(full, name));
      ancestors.delete(real);
    } catch (error) {
      if (error.code !== "ELOOP") unread.push([full, error.code]);
    }
  };
  visit(skill);
  return { files, unread };
}

const isBundled = (rel) => {
  const parts = rel.split(path.sep);
  return parts.length === 2 && BUNDLE_FOLDERS.has(parts[0]);
};

const IMPORT = /(?:^|[;:])[ \t]*(?:from[ \t]+([\w.]+)[ \t]+)?import[ \t]+(\([^)]*\)|[^;\n]*)/gm;

// WHY: a statement can span lines through a bracket or a backslash and hold a comment, so a pattern over raw lines keeps missing forms of one import.
function importedModules(text) {
  const code = text.replace(/#.*$/gm, "").replace(/\\\r?\n/g, " ");
  return [...code.matchAll(IMPORT)].flatMap(([, from, items]) => {
    const names = items
      .replace(/[()]/g, "")
      .split(",")
      .map((item) => item.trim().split(/\s+/)[0])
      .filter(Boolean);
    return from === undefined ? names : [from, ...names.map((name) => `${from}${from.endsWith(".") ? "" : "."}${name}`)];
  });
}

function importsFile(rel, text) {
  const { dir, name } = path.parse(rel);
  return importedModules(text).some((module) => {
    const parts = module.replace(/^\.+/, "").split(".");
    return parts.at(-1) === name && (parts.length === 1 || parts.at(-2) === dir);
  });
}

const PATH_CHARACTERS = "[\\w.$~{}/-]";
const PATH_PART = `(?:<[\\w-]+>|${PATH_CHARACTERS})`;
const PLACEHOLDER_ROOT = /^.*(?:\$\{?\w+\}?|<[\w-]+>|\{[\w-]+\})\//;
// WHY: what closes `$(dirname "$0")` or `"$DIR"` roots the path after it, while a slash after a space or an opening quote is the filesystem's root.
const CLOSES_A_ROOT = /(?:[)}]|[\w)}]["'])$/;

function writtenPaths(base, ext, text) {
  // WHY: a period after a name closes a sentence, while one followed by more of a word makes it another file.
  const pattern = `(?<!${PATH_CHARACTERS})(?:${PATH_PART}*/)?${RegExp.escape(base)}(?!\\.?[\\w/-])`;
  return (
    [...text.matchAll(new RegExp(pattern, "g"))]
      // WHY: without an extension the bare name is an ordinary word, so only a path says it means the file.
      .filter(([written]) => ext || written !== base)
      .map(({ 0: written, index }) => {
        const rooted = written.replace(PLACEHOLDER_ROOT, "");
        return rooted.startsWith("/") && CLOSES_A_ROOT.test(text.slice(Math.max(0, index - 2), index)) ? rooted.slice(1) : rooted;
      })
  );
}

// WHY: this rule fails the run, and a shell's working directory is unknown, so a path counts from any folder of the skill unless the writer's own folder settles it on another file.
function naming(rel, skill, files) {
  const { base, ext } = path.parse(rel);
  const target = path.join(skill, rel);
  const folders = [...new Set(files.map((file) => path.dirname(file)))];
  return (other, text) => {
    const landsOn = (written) => {
      const own = path.resolve(skill, path.dirname(other), written);
      if (own !== target && files.includes(own)) return false;
      return folders.some((folder) => path.resolve(folder, written) === target);
    };
    return writtenPaths(base, ext, text).some(landsOn) || (ext === ".py" && other.endsWith(".py") && importsFile(rel, text));
  };
}

export default {
  names: ["skill-bundled-files"],
  description: "A file under a skill's scripts or references folder is named by another file of the skill",
  tags: ["agents-guru"],
  parser: "none",
  function(params, onError) {
    if (!isSkillFile(params.name)) return;
    const skill = path.dirname(path.resolve(params.name));
    const { files, unread } = skillFiles(skill);
    const texts = new Map();
    for (const file of files) {
      try {
        texts.set(file, fs.readFileSync(file, "utf8"));
      } catch (error) {
        unread.push([file, error.code]);
      }
    }
    const report = (detail) => onError({ lineNumber: FRONTMATTER_LINE, detail });
    const relative = (file) => path.relative(skill, file) || ".";
    // WHY: a clean run would otherwise claim a comparison that never happened.
    for (const [file, code] of unread) report(`could not read ${relative(file)} (${code}), so no name in it was compared`);
    for (const file of files) {
      if (!isBundled(relative(file))) continue;
      const names = naming(relative(file), skill, files);
      const named = [...texts].some(([other, text]) => fs.realpathSync(other) !== fs.realpathSync(file) && names(relative(other), text));
      if (!named) report(`${relative(file)} is named by no file of this skill, so an agent never learns it exists: list it in SKILL.md`);
    }
  },
};
