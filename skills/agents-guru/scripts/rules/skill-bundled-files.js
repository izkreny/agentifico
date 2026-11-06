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
      if (stat?.isFile()) {
        files.push(full);
      }
      if (!stat?.isDirectory()) {
        return;
      }
      const real = fs.realpathSync(full);
      // WHY: only a folder this walk is already inside is a loop, while a second link to a folder is a second path an agent can be told.
      if (ancestors.has(real)) {
        return;
      }
      ancestors.add(real);
      for (const name of fs.readdirSync(full).filter((entry) => !skipped(entry))) {
        visit(path.join(full, name));
      }
      ancestors.delete(real);
    } catch (error) {
      if (error.code !== "ELOOP") {
        unread.push([full, error.code]);
      }
    }
  };
  visit(skill);
  return { files, unread };
}

const isBundled = (rel) => {
  const parts = rel.split(path.sep);
  return parts.length === 2 && BUNDLE_FOLDERS.has(parts[0]);
};

const IMPORT = /(?:^|[;:])[ \t]*(?:from[ \t]+(?<from>[\w.]+)[ \t]+)?import[ \t]+(?<items>\([^)]*\)|[^;\n]*)/gmu;

// WHY: a statement can span lines through a bracket or a backslash and hold a comment, so a pattern over raw lines keeps missing forms of one import.
function importedModules(text) {
  // Stryker disable next-line Regex: a dot stops at a line break, so the comment pattern ends at the line's end with or without its anchor.
  const code = text.replace(/#.*$/gmu, "").replace(/\\\r?\n/gu, " ");
  return [...code.matchAll(IMPORT)].flatMap(({ groups: { from, items } }) => {
    // Stryker disable next-line MethodExpression: an empty name names no file, so filtering it out changes nothing.
    const names = items
      .replace(/[()]/gu, "")
      .split(",")
      .map(
        (item) =>
          // Stryker disable next-line Regex: the item is trimmed first, so a single-space split leaves its first word the same.
          item.trim().split(/\s+/u)[0],
      )
      .filter(Boolean);
    return from === undefined ? names : [from, ...names.map((name) => `${from}${from.endsWith(".") ? "" : "."}${name}`)];
  });
}

function importsFile(rel, text) {
  const { dir, name } = path.parse(rel);
  return importedModules(text).some((module) => {
    const parts = module.replace(/^\.+/u, "").split(".");
    return parts.at(-1) === name && (parts.length === 1 || parts.at(-2) === dir);
  });
}

const LITERAL = "[\\w.~/-]";
// WHY: a slash is the filesystem's root only with nothing before it, so whatever else stands there is a root this rule cannot read, and no list of spellings could name them all.
const NOTHING_BEFORE = /(?:^|[\s([=:,])["'`]?$/u;

function writtenPaths(base, ext, text) {
  // WHY: a period after a name closes a sentence, while one followed by more of a word makes it another file.
  const pattern = `(?<!${LITERAL})(?:${LITERAL}*/)?${RegExp.escape(base)}(?!\\.?[\\w/-])`;
  return (
    [...text.matchAll(new RegExp(pattern, "gu"))]
      // WHY: without an extension the bare name is an ordinary word, so only a path says it means the file.
      .filter(([written]) => ext || written !== base)
      .map(({ 0: written, index }) => {
        if (text[index - 1] === "$") {
          return { written: written.slice(written.indexOf("/") + 1), rooted: true };
        }
        if (written.startsWith("/") && !NOTHING_BEFORE.test(text.slice(Math.max(0, index - 2), index))) {
          return { written: written.slice(1), rooted: true };
        }
        return { written, rooted: false };
      })
  );
}

// WHY: this rule fails the run, and a shell's working directory is unknown, so a path counts from any folder of the skill, unless it has no root of its own and the writer's folder settles it on another file.
function naming(rel, skill, files) {
  const { base, ext } = path.parse(rel);
  const target = path.join(skill, rel);
  const folders = [...new Set(files.map((file) => path.dirname(file)))];
  return (other, text) => {
    const landsOn = ({ written, rooted }) => {
      const own = path.resolve(skill, path.dirname(other), written);
      if (!rooted && own !== target && files.includes(own)) {
        return false;
      }
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
    if (!isSkillFile(params.name)) {
      return;
    }
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
    for (const [file, code] of unread) {
      report(`could not read ${relative(file)} (${code}), so no name in it was compared`);
    }
    for (const file of files) {
      if (!isBundled(relative(file))) {
        continue;
      }
      const names = naming(relative(file), skill, files);
      const named = [...texts].some(([other, text]) => fs.realpathSync(other) !== fs.realpathSync(file) && names(relative(other), text));
      if (!named) {
        report(`${relative(file)} is named by no file of this skill, so an agent never learns it exists: list it in SKILL.md`);
      }
    }
  },
};
