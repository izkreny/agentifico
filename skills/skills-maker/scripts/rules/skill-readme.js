// The README rule workflows/new.md owns and workflows/check.md describes.
// Anchored to SKILL.md with no parser, because a README that does not exist is
// never a file markdownlint visits, so a rule anchored to the README could
// never report the case that matters. skill-layout.js reads the filesystem from
// a SKILL.md's own path the same way.
import fs from "node:fs";
import path from "node:path";
import { FRONTMATTER_LINE, isSkillFile } from "./frontmatter.js";

// The install forms are workflows/new.md's to state, under "How it is
// installed", and this is that list. A form added there is added here; the two
// disagreeing is the defect the single home exists to prevent. No trailing
// word boundary on the heading, because that file states the form as a heading
// whose text *opens with* the word, which "Installing" does.
const INSTALL_HEADING = /^#{1,6}\s+(?:install|installation|setup|getting started)/im;
const INSTALL_COMMAND = /^[^\S\n]*(?:skills add|npm install|npm ci|mise use|claude plugin install|git clone|ln -s)\b/im;

// Each form is looked for where workflows/new.md says it counts: the heading
// outside a fence, the command inside one. Without the split, a heading quoted
// inside a fenced example counts as a real one, and a command named in prose
// counts as a fenced block nobody wrote. The scan is the one docs-check.py
// makes, which keeps the fence marker's own length so a longer fence nested
// inside a shorter one cannot close it early.
export function fencedAndProse(readme) {
  const fenced = [];
  const prose = [];
  let open = null;
  for (const line of readme.split("\n")) {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker) {
      if (open === null) open = marker;
      else if (marker.length >= open.length && marker[0] === open[0]) open = null;
      continue;
    }
    (open === null ? prose : fenced).push(line);
  }
  return { fenced: fenced.join("\n"), prose: prose.join("\n") };
}

export function carriesInstallForm(readme) {
  const { fenced, prose } = fencedAndProse(readme);
  return INSTALL_HEADING.test(prose) || INSTALL_COMMAND.test(fenced);
}

export default {
  names: ["skill-readme"],
  description: "A README.md sits beside every SKILL.md and says how the skill is installed",
  tags: ["skills-maker"],
  parser: "none",
  function(params, onError) {
    if (!isSkillFile(params.name)) return;
    const readme = path.join(path.dirname(path.resolve(params.name)), "README.md");
    if (!fs.existsSync(readme)) {
      onError({ lineNumber: FRONTMATTER_LINE, detail: "no README.md beside this SKILL.md: a reader deciding whether to trust the skill has nothing to read" });
      return;
    }
    let content;
    try {
      content = fs.readFileSync(readme, "utf8");
    } catch (error) {
      onError({ lineNumber: FRONTMATTER_LINE, detail: `README.md cannot be read (${error.code}): ${readme}` });
      return;
    }
    if (!carriesInstallForm(content))
      onError({ lineNumber: FRONTMATTER_LINE, detail: "README.md carries no install form: a reader who cannot install the skill cannot use it" });
  },
};
