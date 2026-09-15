// A module rather than a config file, so nothing under a target is ever read as configuration.
import skillBoldedParagraphs from "./rules/skill-bolded-paragraphs.js";
import skillBoldedRuns from "./rules/skill-bolded-runs.js";
import skillContinuations from "./rules/skill-continuations.js";
import skillDescription from "./rules/skill-description.js";
import skillFrontmatterParsed from "./rules/skill-frontmatter-parsed.js";
import skillInvocation from "./rules/skill-invocation.js";
import skillLayout from "./rules/skill-layout.js";
import skillName from "./rules/skill-name.js";
import skillPortablePaths from "./rules/skill-portable-paths.js";
import skillReadme from "./rules/skill-readme.js";
import skillReferencedPaths from "./rules/skill-referenced-paths.js";
import skillValeDirective from "./rules/skill-vale-directive.js";

// Contract findings are grouped apart from prose-shape ones because a contract failure is silent and would be buried under findings a reader can see.
const contractRules = [
  skillDescription,
  skillFrontmatterParsed,
  skillName,
  skillInvocation,
  skillLayout,
  skillReadme,
  skillPortablePaths,
  skillReferencedPaths,
  skillValeDirective,
];
const proseShapeRules = [skillContinuations, skillBoldedRuns, skillBoldedParagraphs];
export const rules = [...contractRules, ...proseShapeRules];

const namesOf = (group) => new Set(group.flatMap((rule) => rule.names));
export const contractRuleNames = namesOf(contractRules);
export const proseShapeRuleNames = namesOf(proseShapeRules);

// A rule named here is off for the reason beside it, never for quiet.
export const config = {
  default: true,
  // A paragraph is one unwrapped line here, so a line-length cap would flag every paragraph.
  MD013: false,
  // No one rule fits what the files here open with, and which opening a given file owes is a judgement, so it sits in the by-hand list in workflows/check.md.
  MD041: false,
};
