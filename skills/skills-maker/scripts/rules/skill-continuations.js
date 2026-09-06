// A list item carries at most one continuation paragraph, and that paragraph
// is the item's reason; a continuation opening with a bolded lead-in is over
// the cap whatever its count. workflows/new.md owns the rule and its reason.
// The parser owns everything else: in micromark's tree a list token holds its
// item prefixes and its content blocks as siblings, so an item is the run of
// children between one prefix and the next, its paragraphs are the paragraphs
// in that run, and a nested list, a fence, a table or a blockquote in the run
// is a different token type that counts for nothing.
const isList = (t) => t.type === "listOrdered" || t.type === "listUnordered";

function walk(tokens, fn) {
  for (const t of tokens) {
    fn(t);
    if (t.children) walk(t.children, fn);
  }
}

// The paragraph a content block carries, if it carries one.
const paragraphOf = (t) => (t.type === "content" ? t.children.find((c) => c.type === "paragraph") : undefined);

// Each item as the line its marker sits on and its paragraphs after the lead,
// where the lead is whatever block opens the item, paragraph or not.
export function items(list) {
  const out = [];
  let item = null;
  let lead = false;
  for (const c of list.children) {
    if (c.type === "listItemPrefix") {
      item = { line: c.startLine, continuations: [] };
      out.push(item);
      lead = true;
      continue;
    }
    if (!item || c.type === "listItemIndent") continue;
    if (lead) {
      lead = false;
      continue;
    }
    const p = paragraphOf(c);
    if (p) item.continuations.push(p);
  }
  return out;
}

const opensBold = (p) => p.children?.[0]?.type === "strong";

export default {
  names: ["skill-continuations"],
  description: "A list item carries at most one continuation paragraph, and none opening with a bolded lead-in",
  tags: ["skills-maker"],
  parser: "micromark",
  function(params, onError) {
    walk(params.parsers.micromark.tokens, (list) => {
      if (!isList(list)) return;
      for (const item of items(list)) {
        for (const p of item.continuations) {
          if (opensBold(p))
            onError({ lineNumber: p.startLine, detail: "continuation opens with a bolded lead-in", context: params.lines[p.startLine - 1].trim() });
        }
        if (item.continuations.length > 1)
          onError({
            lineNumber: item.line,
            detail: `${item.continuations.length} continuation paragraphs, cap is 1`,
            context: params.lines[item.line - 1].trim(),
          });
      }
    });
  },
};
