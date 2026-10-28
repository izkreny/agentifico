// A module rather than a config file, so nothing under a target is ever read as configuration.
import agentFrontmatter, { agentPluginName } from "./rules/agent-frontmatter.js";
import skillArgumentHint from "./rules/skill-argument-hint.js";
import skillBashBlocks from "./rules/skill-bash-blocks.js";
import skillBoldedParagraphs from "./rules/skill-bolded-paragraphs.js";
import skillBoldedRuns from "./rules/skill-bolded-runs.js";
import skillContinuations from "./rules/skill-continuations.js";
import skillDescription from "./rules/skill-description.js";
import skillFork from "./rules/skill-fork.js";
import skillFrontmatterParsed from "./rules/skill-frontmatter-parsed.js";
import skillHardWrap from "./rules/skill-hard-wrap.js";
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
  skillFork,
  skillLayout,
  skillReadme,
  skillPortablePaths,
  skillReferencedPaths,
  skillValeDirective,
  skillArgumentHint,
  skillBashBlocks,
  agentFrontmatter,
];
const proseShapeRules = [skillContinuations, skillBoldedRuns, skillBoldedParagraphs];
// A warning rule's findings print in its group but leave the run passing: agent-plugin-name because the file still loads, skill-hard-wrap because a skill may decline its author's conventions, per workflows/export.md, which a caller can also do with --skip.
const contractWarningRules = [agentPluginName];
const proseShapeWarningRules = [skillHardWrap];
export const rules = [...contractRules, ...contractWarningRules, ...proseShapeRules, ...proseShapeWarningRules];

const namesOf = (group) => new Set(group.flatMap((rule) => rule.names));
export const contractRuleNames = namesOf([...contractRules, ...contractWarningRules]);
export const warningRuleNames = namesOf([...contractWarningRules, ...proseShapeWarningRules]);
export const proseShapeRuleNames = namesOf([...proseShapeRules, ...proseShapeWarningRules]);
// A caller's --skip reaches only the author's conventions, because a contract rule's failure is silent; yaml-comment-wrap is named here since scripts/check.js raises it itself.
export const skippableRuleNames = new Set([...namesOf(proseShapeWarningRules), "yaml-comment-wrap"]);

// A rule named here is off for the reason beside it, never for quiet.
export const config = {
  default: true,
  // A paragraph is one unwrapped line here, so a line-length cap would flag every paragraph.
  MD013: false,
  // No one rule fits what the files here open with, and which opening a given file owes is a judgement, so it sits in the by-hand list in workflows/check.md.
  MD041: false,
};
