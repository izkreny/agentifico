import { isHomeRelative, looksLikePath, resolves } from "./paths.js";

// A fenced block is a command to run rather than a reference to a file in this tree, so only code spans in prose are read.
const IS_PROSE_SPAN = (token) => token.type === "codeTextData";

function walk(tokens, fn) {
  for (const token of tokens) {
    fn(token);
    if (token.children) walk(token.children, fn);
  }
}

export default {
  names: ["skill-referenced-paths"],
  description: "A path a skill names in prose resolves to something on disk",
  tags: ["skills-maker"],
  parser: "micromark",
  function(params, onError) {
    const root = params.config.root ?? process.cwd();
    walk(params.parsers.micromark.tokens, (token) => {
      if (!IS_PROSE_SPAN(token)) return;
      const span = String(token.text ?? "");
      if (isHomeRelative(span)) return;
      if (!looksLikePath(span)) return;
      if (resolves(span, params.name, root)) return;
      onError({
        lineNumber: token.startLine,
        detail: `${span} does not resolve against this skill, this file's directory or the target`,
        context: params.lines[token.startLine - 1]?.trim(),
      });
    });
  },
};
