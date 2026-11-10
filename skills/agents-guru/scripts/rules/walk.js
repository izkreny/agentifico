export function walk(tokens, fn) {
  tokens.forEach((token, i) => {
    fn(token, tokens[i - 1]);
    walk(token.children, fn);
  });
}
