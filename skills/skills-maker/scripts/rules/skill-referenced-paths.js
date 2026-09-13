// The referenced-path rule workflows/check.md describes: a router pointing at
// a file nobody wrote fails only on the day that route is taken. The decision
// procedure is docs-check.py's, reached through scripts/rules/paths.js, which
// names the script it came from.
import { isHomeRelative, looksLikePath, resolves } from "./paths.js";

// Code spans in prose only. A fenced block is a command to run rather than a
// reference to a file in this tree, and docs-check.py drops fenced content
// before it looks for a span at all; a link destination is markdown's own
// business and is checked by nothing here.
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
      // A `~/` span names a file on the author's own machine, so no checkout
      // can resolve it. scripts/rules/paths.js owns that agreement.
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
