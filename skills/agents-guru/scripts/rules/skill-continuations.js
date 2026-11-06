// In micromark's tree a list token holds its item prefixes and its content blocks as siblings, so an item is the run of children between one prefix and the next.
export const isList = (t) => t.type === "listOrdered" || t.type === "listUnordered";

function walk(tokens, fn) {
  for (const t of tokens) {
    fn(t);
    // Stryker disable next-line ConditionalExpression: markdownlint gives every micromark token a children array, so the guard always holds.
    if (t.children) walk(t.children, fn);
  }
}

export const paragraphOf = (t) => {
  // Stryker disable next-line ConditionalExpression: only a content token holds a paragraph as a direct child, so the type test only saves a search.
  if (t.type !== "content") return;
  return t.children.find((c) => c.type === "paragraph");
};

// Stryker disable next-line OptionalChaining: a paragraph always holds at least one token, so only the first optional chain is ever needed.
export const opensBold = (p) => p?.children?.[0]?.type === "strong";

// A container's own prefix or indent sits between a marker and text that starts on the next line, so whitespace is matched by token family rather than by name.
// Stryker disable next-line Regex: no list token type names these words except where anchored
const isSpace = (t) => /^lineEnding|Prefix$|Indent$/.test(t.type);

// The lead is whatever block opens an item, paragraph or not, so a paragraph after it is a continuation whatever the item began with.
export function items(list) {
  const out = [];
  let item = null;
  // Stryker disable next-line BooleanLiteral: a list's first child is its item prefix, which sets lead before anything reads it.
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
  tags: ["agents-guru"],
  parser: "micromark",
  function(params, onError) {
    walk(params.parsers.micromark.tokens, (list) => {
      // Stryker disable next-line ConditionalExpression: items finds no item in a token that is not a list, so the guard only saves the search.
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
