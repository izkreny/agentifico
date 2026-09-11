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

export const rules = [skillDescription, skillFrontmatterParsed, skillName, skillInvocation, skillContinuations, skillLayout];

// Which names belong to this package rather than to markdownlint, so check.js
// asks the array that already answers it. A membership test written over there
// would be a second copy, and the copy is what goes stale when a rule arrives.
export const ownRuleNames = new Set(rules.flatMap((rule) => rule.names));

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
