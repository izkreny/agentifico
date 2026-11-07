// WHY: where a command is recognised is the skills page's, at https://code.claude.com/docs/en/skills, and what stops it is the errors page's, at https://code.claude.com/docs/en/errors#no-shell-command-was-run.
import { isSkillFile } from "./frontmatter.js";
import { infoOf } from "./skill-bash-blocks.js";

// WHY: a carriage return is half of a newline in a file with CRLF endings.
const CONTROL = /(?![\t\n\r])\p{Cc}/u;

function walk(tokens, fn) {
  tokens.forEach((token, i) => {
    fn(token, tokens[i - 1]);
    if (token.children) walk(token.children, fn);
  });
}

export default {
  names: ["skill-injected-commands"],
  description: "A ! command in a SKILL.md is one Claude Code runs",
  tags: ["agents-guru"],
  parser: "micromark",
  function(params, onError) {
    if (!isSkillFile(params.name)) return;
    const report = (lineNumber, detail) => onError({ lineNumber, detail, context: params.lines[lineNumber - 1].trim() });
    const stopped = "a raw control character stops every ! command in this file from running: remove it";
    walk(params.parsers.micromark.tokens, (token, before) => {
      if (token.type === "codeFenced" && infoOf(token) === "!") {
        for (const line of token.children) if (line.type === "codeFlowValue" && CONTROL.test(line.text)) report(line.startLine, stopped);
      }
      // WHY: the tree is read because a raw scan for the pair also finds a span that merely ends in the character.
      if (token.type !== "codeText" || before?.type !== "data" || !before.text.endsWith("!")) return;
      const preceding = params.lines[before.endLine - 1][before.endColumn - 3];
      if (preceding && !/\s/.test(preceding))
        report(token.startLine, "a ! command that does not open a line or follow whitespace stays literal text and does not run: put a space before the !");
      else if (CONTROL.test(token.text)) report(token.startLine, stopped);
    });
  },
};
