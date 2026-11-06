// WHY: what is replaced and what escapes it are the skills page's, at https://code.claude.com/docs/en/skills.
import { isSkillFile } from "./frontmatter.js";

const PLACEHOLDER = /(\\*)\$(\d+)/gu;

function walk(tokens, fn) {
  for (const token of tokens) {
    fn(token);
    // Stryker disable next-line ConditionalExpression: markdownlint gives every micromark token a children array, so the guard always holds.
    if (token.children) walk(token.children, fn);
  }
}

export default {
  names: ["skill-argument-placeholders"],
  description: "A $N in a SKILL.md's code stays what it was written as when the skill is called with arguments",
  tags: ["agents-guru"],
  parser: "micromark",
  function(params, onError) {
    if (!isSkillFile(params.name)) return;
    walk(params.parsers.micromark.tokens, (token) => {
      // WHY: a $N in prose is the feature the page documents, so only code is read.
      if (token.type !== "codeTextData" && token.type !== "codeFlowValue") return;
      for (const [, backslashes, index] of token.text.matchAll(PLACEHOLDER)) {
        // WHY: the page says only a single backslash escapes, and a doubled one leaves the placeholder live.
        if (backslashes.length === 1) continue;
        onError({
          lineNumber: token.startLine,
          detail: `$${index} in code is replaced by an argument when the skill is called with one: write \\$${index} to keep it, or $ARGUMENTS[${index}] if the argument is meant`,
          context: params.lines[token.startLine - 1].trim(),
        });
      }
    });
  },
};
