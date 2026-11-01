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

function pythonImport(rel) {
  const { dir, name } = path.parse(rel);
  const module = RegExp.escape(name);
  const item = "[\\w.]+(?:\\s+as\\s+\\w+)?\\s*,\\s*";
  const end = "(?![\\w.])";
  return new RegExp(
    [
      `^\\s*from\\s+[\\w.]*?(?<!\\w)${module}\\s+import\\b`,
      `^\\s*import\\s+(?:${item})*(?:${dir}\\.)?${module}${end}`,
      `^\\s*from\\s+(?:\\.+|${dir})\\s+import\\s+\\(?\\s*(?:${item})*${module}${end}`,
    ].join("|"),
    "m",
  );
}

function naming(rel) {
  const { base, ext } = path.parse(rel);
  // WHY: `workflows/review.md` points at another file of the same name, while `$DIR/review.md` does not.
  const start = "(?<![\\w.-])(?<!(?:^|[^$\\w])[\\w-]+/)";
  // WHY: a period after a name closes a sentence, while one followed by more of a word makes it another file.
  const end = "(?!\\.?[\\w-])";
  const whole = `${start}${RegExp.escape(rel)}${end}`;
  // WHY: without an extension the bare name is an ordinary word, so only a path says it means the file.
  const bare = `${ext ? "" : "(?<=/)"}${RegExp.escape(base)}${end}`;
  const sibling = new RegExp(`${start}${bare}|${whole}`, "m");
  // WHY: `./name` means the folder of the file that writes it.
  const elsewhere = new RegExp(`${start}(?<!\\./)${bare}|${whole}`, "m");
  const imported = ext === ".py" && pythonImport(rel);
  return (other, text) =>
    (path.dirname(other) === path.dirname(rel) ? sibling : elsewhere).test(text) || (imported && other.endsWith(".py") && imported.test(text));
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
      const names = naming(relative(file));
      const named = [...texts].some(([other, text]) => fs.realpathSync(other) !== fs.realpathSync(file) && names(relative(other), text));
      if (!named) report(`${relative(file)} is named by no file of this skill, so an agent never learns it exists: list it in SKILL.md`);
    }
  },
};
