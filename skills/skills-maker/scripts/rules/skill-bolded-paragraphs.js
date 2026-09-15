// The bolded-paragraph cap workflows/new.md owns and workflows/check.md
// describes. A heading or a paragraph that opens plain ends a run, and nothing
// else does: a fence, a list or a table between two bolded paragraphs is no
// paragraph the bold could stand out from, so it sits inside the run. Only the
// top-level tokens are read, which keeps a paragraph inside an item or a quote
// out of the count by construction.
import { CAP } from "./skill-bolded-runs.js";
import { opensBold, paragraphOf } from "./skill-continuations.js";

const isHeading = (t) => t.type === "atxHeading" || t.type === "setextHeading";

export default {
  names: ["skill-bolded-paragraphs"],
  description: `At most ${CAP} paragraphs in a row open with a bolded lead`,
  tags: ["skills-maker"],
  parser: "micromark",
  function(params, onError) {
    let run = [];
    const flush = () => {
      if (run.length > CAP)
        onError({
          lineNumber: run[0].startLine,
          detail: `${run.length} bolded-lead paragraphs in a row, cap is ${CAP}`,
          context: params.lines[run[0].startLine - 1].trim(),
        });
      run = [];
    };
    for (const t of params.parsers.micromark.tokens) {
      const p = paragraphOf(t);
      if (opensBold(p)) run.push(p);
      else if (p || isHeading(t)) flush();
    }
    flush();
  },
};
