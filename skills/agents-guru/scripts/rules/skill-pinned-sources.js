import fs from "node:fs";
import path from "node:path";

const SOURCE_SECTION = /^(?:inspiration|sources)$/i;
const GIT_HOST = /^https?:\/\/(?:www\.)?(?:github\.com|gist\.github\.com|raw\.githubusercontent\.com|gitlab\.com|bitbucket\.org|codeberg\.org)\//i;
// WHY: a tag or a short sha can come to name another commit later, so only a full sha is a pin.
const COMMIT = /\/[0-9a-f]{40}(?:[/?#]|$)/;
// WHY: an owner's profile and an issue, pull request or discussion have no commit, so the advice to link one could never be followed.
const NO_COMMIT_PAGE = /^https?:\/\/[^/]+\/[^/?#]+(?:\/?(?:[?#]|$)|\/[^/?#]+\/(?:-\/)?(?:issues|pulls?|pull-requests|merge_requests|discussions)(?:[/?#]|$))/i;
const CARRIES_A_LINK = new Set(["resourceDestinationString", "definitionDestinationString", "autolinkProtocol", "literalAutolinkHttp"]);

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

export default {
  names: ["skill-pinned-sources"],
  description: "A README's source section links a git host at the commit that was read",
  tags: ["agents-guru"],
  parser: "micromark",
  function(params, onError) {
    if (path.basename(params.name) !== "README.md") return;
    if (!fs.existsSync(path.join(path.dirname(path.resolve(params.name)), "SKILL.md"))) return;
    let sectionLevel = null;
    for (const token of params.parsers.micromark.tokens) {
      const heading = headingOf(token);
      if (heading) {
        if (sectionLevel === null || heading.level <= sectionLevel) sectionLevel = SOURCE_SECTION.test(heading.text) ? heading.level : null;
        continue;
      }
      if (sectionLevel === null) continue;
      walk([token], (inner) => {
        if (!CARRIES_A_LINK.has(inner.type) || !GIT_HOST.test(inner.text) || COMMIT.test(inner.text) || NO_COMMIT_PAGE.test(inner.text)) return;
        onError({
          lineNumber: inner.startLine,
          detail: `${inner.text} names no commit, so nobody can compare the skill against what it took: link the commit that was read`,
          context: params.lines[inner.startLine - 1].trim(),
        });
      });
    }
  },
};
