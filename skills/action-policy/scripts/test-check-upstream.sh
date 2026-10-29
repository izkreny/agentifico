#!/usr/bin/env bash
# Regression bench for check-upstream.sh. Run it after any edit to that file.
#
# WHY: the script's clean run is only evidence once each of its other outcomes has been
# seen. A stub curl serves crafted bundles, so every case runs offline and none depends on
# what upstream happens to publish today.
set -euo pipefail

SCRIPT="$(cd "$(dirname "$0")" && pwd)/check-upstream.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fails=0

mkdir -p "$WORK/bin"
cat > "$WORK/bin/curl" <<'STUB'
#!/usr/bin/env bash
[ "$STUB_BODY" = fail ] && exit 22
while [ $# -gt 0 ]; do
  if [ "$1" = -o ]; then cp "$STUB_BODY" "$2"; exit 0; fi
  shift
done
exit 22
STUB
chmod +x "$WORK/bin/curl"

# WHY: the script refuses a response under 100 lines as not the bundle, so every bundle
# that should be read carries padding past that floor.
bundle() {
  local body="$1" markers="${2:-yes}"
  if [ "$markers" = yes ]; then printf -- '---\nurl: /guide.md\n---\n'; fi
  printf '%b\n' "$body"
  if [ "$markers" = yes ]; then printf -- '---\nurl: /guide/other.md\n---\n'; fi
  for i in $(seq 1 120); do printf 'line %s\n' "$i"; done
}

expect() {
  local want="$1" name="$2" snapshot="$3" fetched="$4" match="$5"
  local skill="$WORK/case" out status
  rm -rf "$skill"
  mkdir -p "$skill/scripts" "$skill/assets"
  cp "$SCRIPT" "$skill/scripts/check-upstream.sh"
  if [ "$snapshot" != none ]; then cp "$snapshot" "$skill/assets/llms-full.txt"; fi
  set +e
  out="$(STUB_BODY="$fetched" PATH="$WORK/bin:$PATH" bash "$skill/scripts/check-upstream.sh" 2>&1)"
  status=$?
  set -e
  if [ "$status" != "$want" ]; then
    printf '  FAIL %s -> exit %s, wanted %s\n' "$name" "$status" "$want"
    printf '       %s\n' "$out"
    fails=$((fails + 1))
    return
  fi
  # WHY: a here-string, since grep -q exits at the first match and under pipefail the
  # writer's SIGPIPE on a long diff would read as the match failing.
  if ! grep -q -- "$match" <<< "$out"; then
    printf '  FAIL %s -> exit %s, but never said %s\n' "$name" "$status" "$match"
    printf '       %s\n' "$out"
    fails=$((fails + 1))
    return
  fi
  printf '  ok   %s\n' "$name"
}

bundle 'See [other](./other.md).' > "$WORK/linked"
bundle 'See [other](./other.md), now edited.' > "$WORK/edited"
bundle 'See [missing](./missing.md).' > "$WORK/uncovered"
bundle 'See [missing](/guide/missing.md).' > "$WORK/rooted"
bundle 'See [missing](./guide/missing.md).' > "$WORK/nested"
bundle 'See [missing](./Missing.md).' > "$WORK/capital"
bundle 'See [missing][m].\n\n[m]: ./missing.md' > "$WORK/reference"
bundle 'See [other](../other.md).' > "$WORK/parent"
bundle 'See [spec](https://example.com/spec.md).' > "$WORK/external"
bundle 'See [other](./advanced/other.md).' > "$WORK/subdir"
{ printf -- '---\nurl: /guide/advanced/deep.md\n---\n'; bundle 'See [other](./other.md).'; } > "$WORK/nestedpage"
bundle 'No links at all.' > "$WORK/unlinked"
bundle 'See [other](./other.md).' no > "$WORK/unmarked"
printf 'too short\n' > "$WORK/short"

echo "check-upstream.sh"
expect 0 "an unchanged bundle"                 "$WORK/linked"    "$WORK/linked"    "^unchanged"
expect 1 "a changed bundle"                    "$WORK/linked"    "$WORK/edited"    "^CHANGED"
expect 1 "a bundle linking a page it lacks"    "$WORK/uncovered" "$WORK/uncovered" "^UNCOVERED"
expect 1 "a missing page linked from the root" "$WORK/rooted"    "$WORK/rooted"    "^UNCOVERED"
expect 1 "a missing page linked by directory"  "$WORK/nested"    "$WORK/nested"    "^UNCOVERED"
expect 1 "a missing page with a capital"       "$WORK/capital"   "$WORK/capital"   "^UNCOVERED"
expect 1 "a missing page by reference"         "$WORK/reference" "$WORK/reference" "^UNCOVERED"
expect 0 "an embedded page linked by ../"      "$WORK/parent"    "$WORK/parent"    "^unchanged"
expect 0 "a link to another site"              "$WORK/external"  "$WORK/external"  "^unchanged"
expect 1 "a page name in another directory"    "$WORK/subdir"    "$WORK/subdir"    "^UNCOVERED"
expect 2 "a page nested below the guide"       "$WORK/nestedpage" "$WORK/nestedpage" "nested below"
expect 0 "a bundle with no page links"         "$WORK/unlinked"  "$WORK/unlinked"  "^unchanged"
expect 2 "a bundle with no url: markers"       "$WORK/linked"    "$WORK/unmarked"  "no 'url:' markers"
expect 2 "a response too short to be a bundle" "$WORK/linked"    "$WORK/short"     "not the bundle"
expect 2 "a fetch that fails"                  "$WORK/linked"    fail              "could not fetch"
expect 2 "no snapshot"                         none              "$WORK/linked"    "no snapshot"

if [ "$fails" -gt 0 ]; then
  printf '%s case(s) failed\n' "$fails"
  exit 1
fi
echo "all cases passed"
