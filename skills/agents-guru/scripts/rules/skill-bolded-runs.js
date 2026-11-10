// A nested list is a list of its own, so it neither extends nor breaks its parent's run.
import { isList, items } from "./skill-continuations.js";
import { walk } from "./walk.js";

export const CAP = 5;

export default {
  names: ["skill-bolded-runs"],
  description: `At most ${CAP} list items in a row open with a bolded lead`,
  tags: ["agents-guru"],
  parser: "micromark",
  function(params, onError) {
    walk(params.parsers.micromark.tokens, (list) => {
      // Stryker disable next-line ConditionalExpression,BlockStatement: items finds no item in a token that is not a list, so the guard only saves the search.
      if (!isList(list)) {
        return;
      }
      let run = [];
      const flush = () => {
        if (run.length > CAP) {
          onError({
            lineNumber: run[0].line,
            detail: `${run.length} bolded-lead items in a row, cap is ${CAP}`,
            context: params.lines[run[0].line - 1].trim(),
          });
        }
        run = [];
      };
      for (const item of items(list)) {
        if (item.boldLead) {
          run.push(item);
        } else {
          flush();
        }
      }
      flush();
    });
  },
};
