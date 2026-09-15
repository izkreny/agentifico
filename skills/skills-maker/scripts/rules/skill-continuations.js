// In micromark's tree a list token holds its item prefixes and its content blocks as siblings, so an item is the run of children between one prefix and the next.
export const isList = (t) => t.type === "listOrdered" || t.type === "listUnordered";

function walk(tokens, fn) {
  for (const t of tokens) {
    fn(t);
    if (t.children) walk(t.children, fn);
  }
}

export const paragraphOf = (t) => (t.type === "content" ? t.children.find((c) => c.type === "paragraph") : undefined);

export const opensBold = (p) => p?.children?.[0]?.type === "strong";

// A container's own prefix or indent sits between a marker and text that starts on the next line, so whitespace is matched by token family rather than by name.
const isSpace = (t) => /^lineEnding|Prefix$|Indent$/.test(t.type);

// The lead is whatever block opens an item, paragraph or not, so a paragraph after it is a continuation whatever the item began with.
export function items(list) {
  const out = [];
  let item = null;
  let lead = false;
  for (const c of list.children) {
    if (c.type === "listItemPrefix") {
      item = { line: c.startLine, boldLead: false, continuations: [] };
      out.push(item);
      lead = true;
      continue;
    }
    if (!item || isSpace(c)) continue;
    if (lead) {
      item.boldLead = opensBold(paragraphOf(c));
      lead = false;
      continue;
    }
    const p = paragraphOf(c);
    if (p) item.continuations.push(p);
  }
  return out;
}

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
