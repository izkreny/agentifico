// An agent runs a fence's commands through Bash, so a block in another shell's syntax fails on whoever's machine runs it.
const OTHER_SHELLS = new Set(["fish", "zsh"]);
const BASH_TAGS = new Set(["bash", "sh", ""]);

// These are the Fish phrasings workflows/check.md names, matched as written rather than by parsing Fish.
const FISH = [
  ["set <name> (", /(?:^|[\s;&|])set\s+[A-Za-z_]\w*\s+\(/],
  ["; or", /;\s*or\b/],
  ["; and", /;\s*and\b/],
];

const ADVICE = "write it in Bash, the shell an agent runs commands through";

function walk(tokens, fn) {
  for (const token of tokens) {
    fn(token);
    if (token.children) walk(token.children, fn);
  }
}

const infoOf = (fenced) => {
  const info = fenced.children[0].children.find((c) => c.type === "codeFencedFenceInfo");
  return info ? info.text.trim().split(/\s+/)[0] : "";
};

export default {
  names: ["skill-bash-blocks"],
  description: "A fenced command block is Bash, never another shell's syntax",
  tags: ["agents-guru"],
  parser: "micromark",
  function(params, onError) {
    walk(params.parsers.micromark.tokens, (token) => {
      if (token.type !== "codeFenced") return;
      const tag = infoOf(token);
      if (OTHER_SHELLS.has(tag)) {
        onError({ lineNumber: token.startLine, detail: `a fenced block tagged ${tag}: ${ADVICE}`, context: params.lines[token.startLine - 1].trim() });
        return;
      }
      if (!BASH_TAGS.has(tag)) return;
      for (const line of token.children) {
        // An agent never executes a comment, so prose in one is free to say "; and".
        if (line.type !== "codeFlowValue" || /^\s*#/.test(line.text)) continue;
        for (const [phrase, pattern] of FISH) {
          if (pattern.test(line.text))
            onError({ lineNumber: line.startLine, detail: `Fish syntax "${phrase}" in a Bash block: ${ADVICE}`, context: line.text.trim() });
        }
      }
    });
  },
};
