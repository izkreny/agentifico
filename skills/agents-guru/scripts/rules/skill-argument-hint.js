import { FRONTMATTER_LINE, frontmatter, isSkillFile, parsed } from "./frontmatter.js";
import { isList } from "./skill-continuations.js";

// A first word that is not a bare lowercase word, such as `<pr-number>` or a path, is a placeholder or a target rather than a verb.
const VERB = /^[a-z][a-z0-9-]*$/;
const firstWord = (text) => {
  const word = text.trim().split(/\s+/)[0];
  return VERB.test(word) ? word : null;
};

// A group of one word is either a verb or a bare placeholder such as `[issue-number]`, so only a group listing alternatives with `|` is held to routing.
function advertised(hint) {
  const all = new Set();
  const menu = new Set();
  let depth = 0;
  let group = [];
  let current = "";
  const close = () => {
    group.push(current);
    current = "";
  };
  for (const ch of hint) {
    if (ch === "[" && depth++ === 0) continue;
    if (ch === "]" && --depth === 0) {
      close();
      const words = group.map(firstWord).filter(Boolean);
      for (const word of words) all.add(word);
      if (group.length > 1) for (const word of words) menu.add(word);
      group = [];
      continue;
    }
    if (ch === "|" && depth === 1) {
      close();
      continue;
    }
    if (depth > 0) current += ch;
  }
  return { all, menu };
}

const headingLevel = (t) => {
  if (t.type === "atxHeading") return t.children.find((c) => c.type === "atxHeadingSequence").text.length;
  // Stryker disable next-line MethodExpression: a setext underline is one character repeated, so it ends with the character it starts with.
  if (t.type === "setextHeading") return t.children.find((c) => c.type === "setextHeadingLine").text.startsWith("=") ? 1 : 2;
  return 0;
};

// Bold and emphasis wrap a condition's spans and its arrow in tokens of their own, so the paragraph is read flattened.
function* inline(tokens) {
  for (const t of tokens) {
    // Stryker disable next-line OptionalChaining: markdownlint gives every token a children array.
    if (t.type !== "codeText" && t.children?.length) yield* inline(t.children);
    else yield t;
  }
}

// Only an item's lead paragraph up to its first arrow is the condition: what follows the arrow names files, tools and other skills.
function conditionVerbs(paragraph) {
  const verbs = [];
  for (const c of inline(paragraph.children)) {
    if (c.type === "data" && c.text.includes("→")) return verbs;
    if (c.type === "codeText") {
      const word = firstWord(
        c.children
          .filter((d) => d.type === "codeTextData")
          .map((d) => d.text)
          .join(""),
      );
      if (word) verbs.push(word);
    }
  }
  // An item with no arrow states no route, so whatever it backticks is not one.
  return [];
}

function readList(list, out) {
  let lead = false;
  for (const c of list.children) {
    if (c.type === "listItemPrefix") {
      lead = true;
      continue;
    }
    if (isList(c)) {
      readList(c, out);
      continue;
    }
    if (!lead || c.type !== "content") continue;
    lead = false;
    const p = c.children.find((d) => d.type === "paragraph");
    if (p) for (const verb of conditionVerbs(p)) out.push({ verb, line: p.startLine });
  }
}

function routes(tokens) {
  const out = [];
  let section = 0;
  let found = false;
  for (const t of tokens) {
    const level = headingLevel(t);
    if (level) {
      if (section && level <= section) section = 0;
      if (!section && /routing/i.test(t.text)) {
        section = level;
        found = true;
      }
      continue;
    }
    if (section && isList(t)) readList(t, out);
  }
  // A routing section yielding no route is a shape the rule cannot read, such as a table, and not proof that nothing routes.
  return found && out.length ? out : null;
}

export default {
  names: ["skill-argument-hint"],
  description: "Every verb a skill's argument-hint advertises is routed, and every routed verb is advertised",
  tags: ["agents-guru"],
  parser: "micromark",
  function(params, onError) {
    if (!isSkillFile(params.name)) return;
    const fm = frontmatter(params);
    if (!fm) return;
    const doc = parsed(fm);
    // Frontmatter that does not parse is `skill-frontmatter-parsed`'s, which reports it already.
    if (doc.errors.length) return;
    const hint = doc.toJS()?.["argument-hint"];
    if (typeof hint !== "string") return;
    const routed = routes(params.parsers.micromark.tokens);
    if (!routed) return;
    const { all: offered, menu } = advertised(hint);
    const routedVerbs = new Set(routed.map((r) => r.verb));
    for (const verb of menu) {
      if (!routedVerbs.has(verb)) onError({ lineNumber: FRONTMATTER_LINE, detail: `argument-hint advertises \`${verb}\`, which no routing bullet routes` });
    }
    for (const { verb, line } of routed) {
      if (!offered.has(verb))
        onError({ lineNumber: line, detail: `routes \`${verb}\`, which argument-hint does not advertise`, context: params.lines[line - 1].trim() });
    }
  },
};
