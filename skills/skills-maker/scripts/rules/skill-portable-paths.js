// The portable-path rule workflows/new.md owns and workflows/check.md
// describes. It reads the token tree rather than the raw lines, because prose
// that mentions a home directory in words is not a path: the three token types
// below are where a path is meant to be copied out and run.
import { ABSOLUTE_TO_ONE_MACHINE, isHomeRelative } from "./paths.js";

// A code span's text, a line inside a fenced block, and a link's destination.
const CARRIES_A_PATH = new Set(["codeTextData", "codeFlowValue", "resourceDestinationString"]);

function walk(tokens, fn) {
  for (const token of tokens) {
    fn(token);
    if (token.children) walk(token.children, fn);
  }
}

export default {
  names: ["skill-portable-paths"],
  description: "A path in a skill survives being read on another machine",
  tags: ["skills-maker"],
  parser: "micromark",
  function(params, onError) {
    walk(params.parsers.micromark.tokens, (token) => {
      if (!CARRIES_A_PATH.has(token.type)) return;
      for (const match of String(token.text ?? "").matchAll(ABSOLUTE_TO_ONE_MACHINE)) {
        const found = match[0];
        if (isHomeRelative(found)) continue;
        onError({
          lineNumber: token.startLine,
          detail: `${found} is absolute to one machine: write it relative to the skill, or as a ~/ path`,
          context: params.lines[token.startLine - 1]?.trim(),
        });
      }
    });
  },
};
