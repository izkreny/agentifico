// The bolded-run cap workflows/new.md owns and workflows/check.md describes.
// A run is consecutive items of one list whose lead opens with a bolded
// phrase; a nested list is a list of its own, so it neither extends nor breaks
// its parent's run. Whether a run is a set or a section is meaning rather than
// shape, so the rule reports the run and the writer chooses the fix.
import { isList, items } from "./skill-continuations.js";

const CAP = 6;

function walk(tokens, fn) {
  for (const t of tokens) {
    fn(t);
    if (t.children) walk(t.children, fn);
  }
}

export default {
  names: ["skill-bolded-runs"],
  description: `At most ${CAP} list items in a row open with a bolded lead`,
  tags: ["skills-maker"],
  parser: "micromark",
  function(params, onError) {
    walk(params.parsers.micromark.tokens, (list) => {
      if (!isList(list)) return;
      let run = [];
      const flush = () => {
        if (run.length > CAP)
          onError({
            lineNumber: run[0].line,
            detail: `${run.length} bolded-lead items in a row, cap is ${CAP}`,
            context: params.lines[run[0].line - 1].trim(),
          });
        run = [];
      };
      for (const item of items(list)) {
        if (item.boldLead) run.push(item);
        else flush();
      }
      flush();
    });
  },
};
