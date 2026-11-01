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
      // WHY: a period after the name closes a sentence, while one followed by more of a word makes it another file.
      const name = new RegExp(`(?<![\\w.-])${RegExp.escape(path.basename(file))}(?!\\.?[\\w-])`);
      const named = [...texts].some(([other, text]) => fs.realpathSync(other) !== fs.realpathSync(file) && name.test(text));
      if (!named) report(`${relative(file)} is named by no file of this skill, so an agent never learns it exists: list it in SKILL.md`);
    }
  },
};
