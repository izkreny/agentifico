function walk(tokens, fn) {
  for (const t of tokens) {
    // markdownlint re-parses an HTML block's contents into a nested paragraph, so the walk stops at one.
    if (t.type === "htmlFlow") continue;
    fn(t);
    if (t.children) walk(t.children, fn);
  }
}

export default {
  names: ["skill-hard-wrap"],
  description: "A paragraph, a list item's paragraph or a blockquote's paragraph is one source line",
  tags: ["agents-guru"],
  parser: "micromark",
  function(params, onError) {
    walk(params.parsers.micromark.tokens, (t) => {
      if (t.type !== "paragraph" || t.endLine === t.startLine) return;
      onError({
        lineNumber: t.startLine,
        detail: `paragraph spans ${t.endLine - t.startLine + 1} lines, write it on one`,
        context: params.lines[t.startLine - 1].trim(),
      });
    });
  },
};
