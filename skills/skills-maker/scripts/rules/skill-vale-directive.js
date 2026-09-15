// The token's own text is read because markdownlint masks the content of every HTML comment in params.lines.
const CARRIES_A_COMMENT = new Set(["htmlFlow", "htmlText"]);

// Case is not optional: <!-- VALE OFF --> silences nothing, so an insensitive match would report a file that was never silenced.
const OPENS_WITH_VALE = /^<!--\s*vale(?![\w-])/;

function walk(tokens, fn) {
  for (const token of tokens) {
    fn(token);
    if (token.children) walk(token.children, fn);
  }
}

export default {
  names: ["skill-vale-directive"],
  description: "A target's own markdown never switches the prose rules off",
  tags: ["skills-maker"],
  parser: "micromark",
  function(params, onError) {
    walk(params.parsers.micromark.tokens, (token) => {
      if (!CARRIES_A_COMMENT.has(token.type)) return;
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
