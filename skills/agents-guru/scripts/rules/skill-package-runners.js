// WHY: the runners and what counts as a version are the using-scripts page's, at https://agentskills.io/skill-creation/using-scripts.
import path from "node:path";
import { isSkillFile } from "./frontmatter.js";
import { owningSkill } from "./paths.js";

// WHY: a command that only asks about a runner runs nothing, while any other word before one, such as a prompt or a wrapper, leaves it running.
const RUNNER = /(?:^|[\s;&|(])(?<!(?:^|[\s;&|(])(?:which|type|echo|printf|hash|-v)\s+)((npx|bunx|uvx|pipx\s+run|deno\s+run|go\s+run)(?=\s|$)([^;&|)]*))/g;
// WHY: words naming another runner are a list of tools rather than a package to run.
const ANOTHER_RUNNER = /(?:^|\s)(?:npx|bunx|uvx|pipx|deno|go)(?:\s|$)/;
// WHY: a leading @ opens a scoped name and `npm:@` opens a scoped specifier, and neither is a version.
const VERSION = /[^\s'":/]@[^\s/]|[=~<>!]=/;
// WHY: a script's own extension marks a file these runners run locally, while every other word may be a registry name or a hosted spec.
const ANY_PACKAGE = /^['"]?[\w@].*(?<!\.(?:py|js|mjs|cjs|ts|sh)['"]?)$/;
// WHY: go run and deno run also take a local file, and only these shapes fetch a package.
const PACKAGE = { go: /^[\w-]+(?:\.[\w-]+)+\//, deno: /^(?:npm|jsr):/ };
// WHY: a quoted string is matched first, so a # inside one is not taken for a comment.
const QUOTED_OR_COMMENT = /'[^']*'|"(?:[^"\\]|\\.)*"|(?:^|\s)#.*$/g;

const withoutComment = (text) => text.replace(QUOTED_OR_COMMENT, (match) => (/^\s*#/.test(match) ? "" : match));

function unpinned(text) {
  return [...text.matchAll(RUNNER)]
    .filter(([, , runner, args]) => {
      const words = args.split(/\s+/).filter((word) => word && !word.startsWith("-"));
      const shape = PACKAGE[runner.split(/\s+/)[0]];
      // WHY: a flag's separate value can sit before the package, and go run and deno run give the package a shape to find it by.
      const fetches = shape ? words.some((word) => shape.test(word)) : ANY_PACKAGE.test(words[0] ?? "");
      return fetches && !VERSION.test(args) && !ANOTHER_RUNNER.test(args);
    })
    .map(([, command]) => command.trim());
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
