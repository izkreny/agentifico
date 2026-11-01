// WHY: the runners and what counts as a version are the using-scripts page's, at https://agentskills.io/skill-creation/using-scripts.
import path from "node:path";
import { isSkillFile } from "./frontmatter.js";
import { owningSkill } from "./paths.js";

// WHY: this rule warns when it cannot tell, so whatever stands before a runner leaves it counted, since a wrapper, a prompt or a quoted command leaves it running.
const RUNNER = /(?:^|[\s;&|(`'"])((npx|bunx|uvx|pipx\s+run|deno\s+run|go\s+run)(?=\s|$)([^;&|)`]*))/g;
// WHY: a leading @ opens a scoped name and `npm:@` opens a scoped specifier, and neither is a version.
const VERSION = /[^\s'":/]@[^\s/]|[=~<>!]=/;
// WHY: only a path or a placeholder marks a local file, since npm reads `chart.js` as a registry name and `tools/run.js` as a hosted spec.
const LOCAL = /^['"]?(?:\.{1,2}(?:\/|['"]?$)|\/|~\/|\$|<)/;
// WHY: pipx runs a word ending in .py as a script, as the using-scripts page shows.
const PIPX_SCRIPT = /\.py['"]?$/;
// WHY: go run and deno run also take a local file, and only these shapes fetch a package.
const PACKAGE = { go: /^[\w-]+(?:\.[\w-]+)+\//, deno: /^(?:npm|jsr):/ };
// WHY: a quoted string is matched first, so a # inside one is not taken for a comment.
const QUOTED_OR_COMMENT = /'[^']*'|"(?:[^"\\]|\\.)*"|(?:^|\s)#.*$/g;

const withoutComment = (text) => text.replace(QUOTED_OR_COMMENT, (match) => (/^\s*#/.test(match) ? "" : match));

function fetchesPackage(runner, args) {
  const tokens = args.split(/\s+/).filter(Boolean);
  const words = tokens.filter((word) => !word.startsWith("-"));
  const shape = PACKAGE[runner];
  if (shape) return words.some((word) => shape.test(word));
  const local = (word) => LOCAL.test(word) || (runner === "pipx" && PIPX_SCRIPT.test(word));
  // WHY: a flag's separate value can sit before the package, so behind a flag any word may be the package.
  return tokens[0]?.startsWith("-") ? words.some((word) => !local(word)) : words.length > 0 && !local(words[0]);
}

const UNTIL_CLOSE = { "'": /^[^']*/, '"': /^(?:[^"\\]|\\.)*/ };

function quoteOpenAt(text, end) {
  let open = "";
  for (let i = 0; i < end; i++) {
    const character = text[i];
    if (character === "\\" && open !== "'") i++;
    else if (open) open = character === open ? "" : open;
    else if (character === "'" || character === '"') open = character;
  }
  return open;
}

function unpinned(text) {
  return [...text.matchAll(RUNNER)]
    .map((match) => {
      const [whole, written, runner] = match;
      // WHY: a quote opened anywhere before a runner holds its command, so the words past the close are no part of it.
      const close = UNTIL_CLOSE[quoteOpenAt(text, match.index + whole.length - written.length)];
      return { runner, command: (close ? written.match(close)[0] : written).trim() };
    })
    .filter(({ runner, command }) => fetchesPackage(runner.split(/\s+/)[0], command.slice(runner.length)) && !VERSION.test(command))
    .map(({ command }) => command);
}

function walk(tokens, fn) {
  for (const token of tokens) {
    fn(token);
    if (token.children) walk(token.children, fn);
  }
}

export default {
  names: ["skill-package-runners"],
  description: "A package-runner command a skill tells an agent to run names a version",
  tags: ["agents-guru"],
  parser: "micromark",
  function(params, onError) {
    // WHY: a README is written for a person, per workflows/new.md, so its install line is no instruction to an agent.
    if (path.basename(params.name) === "README.md") return;
    if (!isSkillFile(params.name) && !owningSkill(params.name, params.config.root ?? process.cwd())) return;
    walk(params.parsers.micromark.tokens, (token) => {
      if (token.type !== "codeTextData" && token.type !== "codeFlowValue") return;
      for (const command of unpinned(withoutComment(token.text)))
        onError({
          lineNumber: token.startLine,
          detail: `${command} names no version, so what it runs changes over time: pin one, as npx eslint@9`,
          context: params.lines[token.startLine - 1].trim(),
        });
    });
  },
};
