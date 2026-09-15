// The token tree is read rather than the raw lines because prose that mentions a home directory in words is not a path.
import { ABSOLUTE_TO_ONE_MACHINE } from "./paths.js";

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
        onError({
          lineNumber: token.startLine,
          detail: `${found} is absolute to one machine: write it relative to the skill, or as a ~/ path`,
          context: params.lines[token.startLine - 1]?.trim(),
        });
      }
    });
  },
};
