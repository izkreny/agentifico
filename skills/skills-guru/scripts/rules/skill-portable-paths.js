// The token tree is read rather than the raw lines because prose that mentions a home directory in words is not a path.
import { ABSOLUTE_TO_ONE_MACHINE, HOME_DIR_PLACEHOLDER, TILDE_PATH } from "./paths.js";

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
  tags: ["skills-guru"],
  parser: "micromark",
  function(params, onError) {
    walk(params.parsers.micromark.tokens, (token) => {
      if (!CARRIES_A_PATH.has(token.type)) return;
      const text = String(token.text ?? "");
      const report = (detail) => onError({ lineNumber: token.startLine, detail, context: params.lines[token.startLine - 1]?.trim() });
      for (const match of text.matchAll(ABSOLUTE_TO_ONE_MACHINE)) {
        report(`${match[0]} is absolute to one machine: write it relative to the skill, as <home-dir>/ in prose, or as ~/ in a command`);
      }
      if (token.type === "codeTextData") {
        for (const match of text.matchAll(TILDE_PATH)) {
          report(`${match[1]} is a ~/ path in prose: write it as <home-dir>/`);
        }
      }
      if (token.type === "codeFlowValue") {
        for (const match of text.matchAll(HOME_DIR_PLACEHOLDER)) {
          report(`${match[0]} is a placeholder in a command, which no shell expands: write it as ~/`);
        }
      }
    });
  },
};
