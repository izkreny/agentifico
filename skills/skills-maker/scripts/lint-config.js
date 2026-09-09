// The one configuration the check runs with: markdownlint's own rules at their
// defaults unless named below, and this package's rules. It is a module rather
// than a config file so that nothing under a target is ever read as
// configuration: the tree being audited does not get to choose which rules
// judge it, and a copy of this package under the target is never imported.
import skillContinuations from "./rules/skill-continuations.js";
import skillDescription from "./rules/skill-description.js";
import skillDescriptionParsed from "./rules/skill-description-parsed.js";
import skillInvocation from "./rules/skill-invocation.js";
import skillLayout from "./rules/skill-layout.js";
import skillName from "./rules/skill-name.js";

export const rules = [skillDescription, skillDescriptionParsed, skillName, skillInvocation, skillContinuations, skillLayout];

// A rule named here is off for the reason beside it, never for quiet.
export const config = {
  default: true,
  // A paragraph is one unwrapped line here, per No hard wrapping in
  // workflows/new.md, so a line-length cap would flag every paragraph.
  MD013: false,
  // A skill file opens with its tools blockquote, not a heading, per the
  // layout workflows/new.md states.
  MD041: false,
};
