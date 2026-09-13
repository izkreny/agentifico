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
// disagreeing is the defect the single home exists to prevent.
const INSTALL_HEADING = /^#{1,6}\s+(?:install|installation|setup|getting started)\b/im;
const INSTALL_COMMAND = /^[^\S\n]*(?:skills add|npm install|npm ci|mise use|claude plugin install|git clone|ln -s)\b/im;

export const carriesInstallForm = (readme) => INSTALL_HEADING.test(readme) || INSTALL_COMMAND.test(readme);

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
