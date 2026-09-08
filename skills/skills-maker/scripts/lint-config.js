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

// A rule named here is off for the reason beside it, never for quiet.
export const config = {
  default: true,
  // A paragraph is one unwrapped line here, per No hard wrapping in
  // workflows/new.md, so a line-length cap would flag every paragraph.
  MD013: false,
  // Nothing here opens with a top-level heading: a skill file and a workflow
  // open with the tools blockquote per the layout workflows/new.md states, and
  // a README with the disclaimer. Which of those a given file owes is a
  // judgement, so it sits in the by-hand list in workflows/check.md.
  MD041: false,
};
