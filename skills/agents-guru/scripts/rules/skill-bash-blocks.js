// An agent runs a fence's commands through Bash, so a block in another shell's syntax fails on whoever's machine runs it.
const OTHER_SHELLS = new Set(["fish", "zsh"]);
const BASH_TAGS = new Set(["bash", "sh", ""]);

// Matched as written rather than parsed, since catching the common Fish forms needs no Fish grammar.
const FISH = [
  ["set <name> (", /(?:^|[\s;&|])set\s+[A-Za-z_]\w*\s+\(/],
  ["; or", /;\s*or\b/],
  ["; and", /;\s*and\b/],
];

// A heredoc body and a quoted string are data the command carries, so neither is matched as syntax.
const HEREDOC = /(?<!<)<<(?!<)(-?)\s*(?:'([^']+)'|"([^"]+)"|\\([\w-]+)|([\w-]+))/g;
const QUOTED = /'[^']*'|"(?:[^"\\]|\\.)*"/g;
// A `<<` inside quotes or inside `(( ))` arithmetic is text or a shift, never a heredoc.
const ARITHMETIC = /\(\(.*?\)\)/g;

function heredocTerminator(text) {
  const spans = [...text.matchAll(QUOTED), ...text.matchAll(ARITHMETIC)].map((m) => [m.index, m.index + m[0].length]);
  for (const m of text.matchAll(HEREDOC)) {
    if (!spans.some(([start, end]) => m.index >= start && m.index < end)) return { word: m[2] ?? m[3] ?? m[4] ?? m[5], tabs: m[1] === "-" };
  }
  return null;
}

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
      let terminator = null;
      for (const line of token.children) {
        if (line.type !== "codeFlowValue") continue;
        if (terminator) {
          if ((terminator.tabs ? line.text.replace(/^\t+/, "") : line.text) === terminator.word) terminator = null;
          continue;
        }
        // An agent never executes a comment, so prose in one is free to say "; and".
        if (/^\s*#/.test(line.text)) continue;
        const code = line.text.replace(QUOTED, "''");
        terminator = heredocTerminator(line.text);
        for (const [phrase, pattern] of FISH) {
          if (pattern.test(code))
            onError({ lineNumber: line.startLine, detail: `Fish syntax "${phrase}" in a Bash block: ${ADVICE}`, context: line.text.trim() });
        }
      }
    });
  },
};
