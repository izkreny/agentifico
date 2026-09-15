// The rule that keeps the premise workflows/check.md states: nothing under the
// target is read as configuration, so a tree cannot switch off the rules that
// judge it. Vale breaks that from inside a file, and a run over such a tree
// prints a clean last line, so the failure is silent and the rule is a contract
// rule in lint-config.js.
//
// It reads the token's own text rather than params.lines, because markdownlint
// masks the content of every HTML comment in those lines: a rule reading them
// sees <!-- .... ... --> and can only match the mask.
const CARRIES_A_COMMENT = new Set(["htmlFlow", "htmlText"]);

// Every directive Vale honours opens with lowercase vale after the marker, with
// the whitespace optional. Case is not: <!-- VALE OFF --> silences nothing, as
// a run of this package's own style against both forms shows, so an
// insensitive match would report a file that was never silenced.
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
