// A module rather than a config file, so nothing under a target is ever read as configuration.
import agentFrontmatter, { agentPluginName } from "./rules/agent-frontmatter.js";
import pluginBodyVariables from "./rules/plugin-body-variables.js";
import skillArgumentHint from "./rules/skill-argument-hint.js";
import skillArgumentPlaceholders from "./rules/skill-argument-placeholders.js";
import skillBashBlocks from "./rules/skill-bash-blocks.js";
import skillBoldedParagraphs from "./rules/skill-bolded-paragraphs.js";
import skillBoldedRuns from "./rules/skill-bolded-runs.js";
import skillBundledFiles from "./rules/skill-bundled-files.js";
import skillContinuations from "./rules/skill-continuations.js";
import skillDescription from "./rules/skill-description.js";
import skillFork from "./rules/skill-fork.js";
import skillFrontmatterParsed from "./rules/skill-frontmatter-parsed.js";
import skillHardWrap from "./rules/skill-hard-wrap.js";
import skillInjectedCommands from "./rules/skill-injected-commands.js";
import skillInvocation from "./rules/skill-invocation.js";
import skillLayout from "./rules/skill-layout.js";
import skillName from "./rules/skill-name.js";
import skillPackageRunners from "./rules/skill-package-runners.js";
import skillPinnedSources from "./rules/skill-pinned-sources.js";
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
  skillBundledFiles,
  skillArgumentPlaceholders,
  skillInjectedCommands,
  agentFrontmatter,
  pluginBodyVariables,
];
const proseShapeRules = [skillContinuations, skillBoldedRuns, skillBoldedParagraphs];
// A warning rule leaves the run passing: agent-plugin-name's file still loads, skill-package-runners' command still runs, skill-pinned-sources' link still opens, and skill-hard-wrap is a convention a skill may decline, per workflows/export.md or a caller's --skip.
const contractWarningRules = [agentPluginName, skillPackageRunners, skillPinnedSources];
const proseShapeWarningRules = [skillHardWrap];
const namesOf = (group) => new Set(group.flatMap((rule) => rule.names));

export const rules = [...contractRules, ...contractWarningRules, ...proseShapeRules, ...proseShapeWarningRules];
export const contractRuleNames = namesOf([...contractRules, ...contractWarningRules]);
export const warningRuleNames = namesOf([...contractWarningRules, ...proseShapeWarningRules]);
export const proseShapeRuleNames = namesOf([...proseShapeRules, ...proseShapeWarningRules]);
// WHY: --skip reaches only rules a skill may decline, and a name no rule module raises is listed by hand.
export const skippableRuleNames = new Set([...namesOf(proseShapeWarningRules), "yaml-comment-wrap", "Agentifico.CommentSentences"]);

// A rule named here is off for the reason beside it, never for quiet.
export const config = {
  default: true,
  // A paragraph is one unwrapped line here, so a line-length cap would flag every paragraph.
  MD013: false,
  // No one rule fits what the files here open with, and which opening a given file owes is a judgement, so it sits in the by-hand list in workflows/check.md.
  MD041: false,
};
