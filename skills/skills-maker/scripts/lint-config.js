// The one configuration the check runs with, per workflows/check.md. It is a
// module rather than a config file so that nothing under a target is ever read
// as configuration: the tree being audited does not get to choose which rules
// judge it, and a copy of this package under the target is never imported.
import skillContinuations from "./rules/skill-continuations.js";
import skillDescription from "./rules/skill-description.js";
import skillFrontmatterParsed from "./rules/skill-frontmatter-parsed.js";
import skillInvocation from "./rules/skill-invocation.js";
import skillLayout from "./rules/skill-layout.js";
import skillName from "./rules/skill-name.js";

// One array per printed class, so a rule added later is filed by answering
// which heading it belongs under rather than by remembering a second list.
// The contract rules decide what a file is, and their failure is silent; the
// prose-shape rules judge how a file lays its prose out, which a reader sees
// and no agent is misled by. Burying a contract finding under prose-shape
// ones is what the grouping prevents.
const contractRules = [skillDescription, skillFrontmatterParsed, skillName, skillInvocation, skillLayout];
const proseShapeRules = [skillContinuations];
export const rules = [...contractRules, ...proseShapeRules];

// check.js asks these rather than testing a name itself, so the membership a
// rule joins is stated where the rule is registered and nowhere else.
const namesOf = (group) => new Set(group.flatMap((rule) => rule.names));
export const contractRuleNames = namesOf(contractRules);
export const proseShapeRuleNames = namesOf(proseShapeRules);

// A rule named here is off for the reason beside it, never for quiet.
export const config = {
  default: true,
  // A paragraph is one unwrapped line here, per No hard wrapping in
  // workflows/new.md, so a line-length cap would flag every paragraph.
  MD013: false,
  // No one rule fits what the files here open with, and which a given file owes
  // is a judgement, so it sits in the by-hand list in workflows/check.md.
  MD041: false,
};
