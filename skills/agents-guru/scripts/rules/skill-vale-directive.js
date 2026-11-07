// The token's own text is read because markdownlint masks the content of every HTML comment in params.lines.
const CARRIES_A_COMMENT = new Set(["htmlFlow", "htmlText"]);

// WHY: <!-- VALE OFF --> silences nothing, so the match keeps its case, and markdownlint reads the comments inside an HTML block again as inline tokens, so an unanchored match would report the block and the comment both.
const OPENS_WITH_VALE = /^<!--\s*vale(?![\w-])/;

function walk(tokens, fn) {
  for (const token of tokens) {
    fn(token);
    // Stryker disable next-line ConditionalExpression: markdownlint gives every micromark token a children array, so the guard always holds.
    if (token.children) walk(token.children, fn);
  }
}

export default {
  names: ["skill-vale-directive"],
  description: "A target's own markdown never switches the prose rules off",
  tags: ["agents-guru"],
  parser: "micromark",
  function(params, onError) {
    walk(params.parsers.micromark.tokens, (token) => {
      if (!CARRIES_A_COMMENT.has(token.type)) return;
      // Stryker disable next-line StringLiteral: markdownlint gives every token its text, so the fallback is never read.
      const text = String(token.text ?? "");
      if (!OPENS_WITH_VALE.test(text)) return;
      onError({
        lineNumber: token.startLine,
        detail:
          "this silences the prose rules for the file that carries it: put the phrase in the exceptions key of the rule it misfires on, under assets/Agentifico/, with its reason beside it",
        context: text.split("\n")[0].trim(),
      });
    });
  },
};
