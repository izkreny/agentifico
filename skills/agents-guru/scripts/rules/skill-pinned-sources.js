import fs from "node:fs";
import path from "node:path";

const SOURCE_SECTION = /^(?:inspiration|sources)$/i;
// WHY: only the domain is read, since a forge's link shapes have no end and the agent reading the warning can judge the page.
const GIT_DOMAIN = /(?:^|\.)(?:github\.com|githubusercontent\.com|gitlab\.com|bitbucket\.org|codeberg\.org)$/;
// WHY: a self-hosted forge and SourceHut's git.sr.ht name git at the start of a subdomain, which leaves github.io and digital.example.com out.
const GIT_SUBDOMAIN = /(?:^|\.)git[^.]*\.[^.]+\.[^.]+$/;
// WHY: a tag or a short sha can come to name another commit later, so only a full sha is a pin, and git's SHA-256 format makes that one longer.
const COMMIT = /\/[0-9a-f]{40}(?:[0-9a-f]{24})?(?:\/|$)/;
const CARRIES_A_LINK = new Set(["resourceDestinationString", "autolinkProtocol", "literalAutolinkHttp"]);

function unpinned(url) {
  if (!URL.canParse(url)) return false;
  const { hostname, pathname } = new URL(url);
  return (GIT_DOMAIN.test(hostname) || GIT_SUBDOMAIN.test(hostname)) && !COMMIT.test(pathname);
}

function headingOf(token) {
  if (token.type === "atxHeading") {
    const text = token.children.find((child) => child.type === "atxHeadingText")?.text ?? "";
    return { text, level: token.children.find((child) => child.type === "atxHeadingSequence").text.length };
  }
  if (token.type === "setextHeading") {
    const text = token.children.find((child) => child.type === "setextHeadingText").text;
    return { text, level: token.text.trimEnd().endsWith("=") ? 1 : 2 };
  }
  return null;
}

function walk(tokens, fn) {
  for (const token of tokens) {
    fn(token);
    walk(token.children, fn);
  }
}

const childOf = (token, type) => token?.children.find((child) => child.type === type);
// WHY: this folds a label as the parser's normalizeIdentifier does, or a link it resolved would find another definition here.
const labelKey = (text) =>
  text
    .replace(/[\t\n\r ]+/g, " ")
    .replace(/^ | $/g, "")
    .toLowerCase()
    .toUpperCase();

// WHY: a definition can sit anywhere in the file, so it is read where a link uses it rather than where it stands.
function definitionsIn(tokens) {
  const definitions = new Map();
  walk(tokens, (token) => {
    if (token.type !== "definition") return;
    const label = labelKey(childOf(childOf(token, "definitionLabel"), "definitionLabelString").text);
    let destination = null;
    walk(token.children, (inner) => {
      if (inner.type === "definitionDestinationString") destination = inner.text;
    });
    if (!definitions.has(label)) definitions.set(label, destination);
  });
  return definitions;
}

function referenceLabel(link) {
  if (childOf(link, "resource")) return null;
  const reference = childOf(childOf(link, "reference"), "referenceString");
  return labelKey((reference ?? childOf(childOf(link, "label"), "labelText")).text);
}

export default {
  names: ["skill-pinned-sources"],
  description: "A README's source section links a git host at the commit that was read",
  tags: ["agents-guru"],
  parser: "micromark",
  function(params, onError) {
    if (path.basename(params.name) !== "README.md") return;
    if (!fs.existsSync(path.join(path.dirname(path.resolve(params.name)), "SKILL.md"))) return;
    const definitions = definitionsIn(params.parsers.micromark.tokens);
    let sectionLevel = null;
    for (const token of params.parsers.micromark.tokens) {
      const heading = headingOf(token);
      if (heading) {
        if (sectionLevel === null || heading.level <= sectionLevel) sectionLevel = SOURCE_SECTION.test(heading.text) ? heading.level : null;
      }
      if (sectionLevel === null) continue;
      walk([token], (inner) => {
        const url =
          inner.type === "link" || inner.type === "image" ? definitions.get(referenceLabel(inner)) : CARRIES_A_LINK.has(inner.type) ? inner.text : undefined;
        if (!url || !unpinned(url)) return;
        onError({
          lineNumber: inner.startLine,
          detail: `${url} names no commit: if it credits a source, link the commit that was read`,
          context: params.lines[inner.startLine - 1].trim(),
        });
      });
    }
  },
};
