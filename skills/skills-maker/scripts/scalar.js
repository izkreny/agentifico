// What YAML makes of one raw frontmatter value, so a quoted value and a value
// carrying a trailing comment are compared by what they parse to rather than by
// their punctuation. Shared by the checks that read a single scalar; the
// description check owns the membership of the traps this deliberately does not
// warn about, because its job is the parsed value and nothing else.
function scalar(raw) {
  // A quoted value ends at its own closing quote, not at the end of the line,
  // so anything trailing it - a comment - is outside the value.
  if (raw.startsWith('"')) {
    const m = raw.slice(1).match(/^((?:[^"\\]|\\.)*)"/);
    if (m) return m[1].replace(/\\(.)/g, "$1");
  }
  if (raw.startsWith("'")) {
    const m = raw.slice(1).match(/^((?:[^']|'')*)'/);
    if (m) return m[1].replace(/''/g, "'");
  }
  // A plain scalar ends at the first ` #`, and YAML strips the space before it
  // however much there is, so the cut is trimmed rather than sliced raw.
  const cut = raw.search(/\s#/);
  return (cut >= 0 ? raw.slice(0, cut) : raw).trim();
}

module.exports = { scalar };
