#!/usr/bin/env bash
# Regression bench for manifest-check.py. Run it after any edit to that file.
#
# It exists because a check that has only ever been seen to pass is indistinguishable
# from one that passes on everything. The first case replays a real tree of this
# repository: at c065668 the marketplace entry carried five tags and the plugin manifest
# six, which is the drift this check was written for. The rest are synthetic, for shapes
# the history has not produced yet - a second plugin above all, since the check exists to
# be plugin-name agnostic and one plugin cannot demonstrate that.
set -euo pipefail

CHECK="$(cd "$(dirname "$0")" && pwd)/manifest-check.py"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fails=0

# want, dir, name, [args...] - runs the check in `dir` and compares the exit status.
expect() {
  local want="$1" dir="$2" name="$3"
  shift 3
  local out status
  set +e
  out="$(cd "$dir" && python3 "$CHECK" "$@" 2>&1)"
  status=$?
  set -e
  if [ "$status" != "$want" ]; then
    printf '  FAIL %s -> exit %s, wanted %s\n' "$name" "$status" "$want"
    printf '       %s\n' "$out"
    fails=$((fails + 1))
    return
  fi
  printf '  ok   %s\n' "$name"
}

# A tree holding one marketplace and one manifest per plugin named in it.
build() {
  local dir="$1" marketplace="$2"
  shift 2
  rm -rf "$dir"
  mkdir -p "$dir/.claude-plugin"
  printf '%s' "$marketplace" > "$dir/.claude-plugin/marketplace.json"
  while [ "$#" -gt 0 ]; do
    mkdir -p "$dir/plugins/$1/.claude-plugin"
    printf '%s' "$2" > "$dir/plugins/$1/.claude-plugin/plugin.json"
    shift 2
  done
}

entry() { # name description tags-json [extra-json]
  printf '{"name":"%s","source":"./plugins/%s","description":"%s","tags":%s%s}' \
    "$1" "$1" "$2" "$3" "${4:-}"
}
manifest() { # name description keywords-json
  printf '{"name":"%s","version":"1.0.0","description":"%s","keywords":%s}' "$1" "$2" "$3"
}
market() { printf '{"name":"bench","plugins":[%s]}' "$1"; }

echo "manifest-check bench"

# 1. The real drift, replayed from this repository's own history.
REAL="$WORK/real"
mkdir -p "$REAL/.claude-plugin" "$REAL/plugins/gh-solo/.claude-plugin"
git -C "$HERE" show c065668:.claude-plugin/marketplace.json > "$REAL/.claude-plugin/marketplace.json"
git -C "$HERE" show c065668:plugins/gh-solo/.claude-plugin/plugin.json > "$REAL/plugins/gh-solo/.claude-plugin/plugin.json"
expect 1 "$REAL" "c065668: tags and keywords had drifted by gh-cli"

# 2. This repository as it stands must be clean, or the bench is testing nothing useful.
expect 0 "$HERE" "the working tree is in step"

# 3-6. One plugin, one defect at a time.
build "$WORK/ok"   "$(market "$(entry acme 'An acme plugin.' '["a","b"]')")"          acme "$(manifest acme 'An acme plugin.' '["b","a"]')"
expect 0 "$WORK/ok" "tags and keywords agree whatever the order"

build "$WORK/desc" "$(market "$(entry acme 'Drifted.' '["a"]')")"                     acme "$(manifest acme 'An acme plugin.' '["a"]')"
expect 1 "$WORK/desc" "a drifted description is caught"

build "$WORK/tags" "$(market "$(entry acme 'An acme plugin.' '["a"]')")"              acme "$(manifest acme 'An acme plugin.' '["a","b"]')"
expect 1 "$WORK/tags" "a keyword missing from the entry is caught"

build "$WORK/ver"  "$(market "$(entry acme 'An acme plugin.' '["a"]' ',"version":"1.0.0"')")" acme "$(manifest acme 'An acme plugin.' '["a"]')"
expect 1 "$WORK/ver" "a version in the entry is caught even when it matches"

# 7-8. Two plugins: the whole point of being name agnostic.
TWO="$(market "$(entry acme 'An acme plugin.' '["a"]'),$(entry bolt 'A bolt plugin.' '["b"]')")"
build "$WORK/two" "$TWO" acme "$(manifest acme 'An acme plugin.' '["a"]')" bolt "$(manifest bolt 'A bolt plugin.' '["b"]')"
expect 0 "$WORK/two" "two plugins, both in step"

build "$WORK/two-bad" "$TWO" acme "$(manifest acme 'An acme plugin.' '["a"]')" bolt "$(manifest bolt 'Drifted.' '["b"]')"
expect 1 "$WORK/two-bad" "the second plugin's drift is caught, not only the first's"
expect 0 "$WORK/two-bad" "naming the clean plugin passes while its neighbour is broken" acme
expect 1 "$WORK/two-bad" "naming the broken plugin fails" bolt

# 9-11. Unreadable input is exit 2, never a silent pass.
expect 2 "$WORK/two-bad" "an unknown plugin name is a usage error" nosuch

build "$WORK/nomanifest" "$(market "$(entry acme 'An acme plugin.' '["a"]')")"
expect 2 "$WORK/nomanifest" "a missing manifest is an error, not a clean run"

mkdir -p "$WORK/nojson/.claude-plugin"
printf 'not json' > "$WORK/nojson/.claude-plugin/marketplace.json"
expect 2 "$WORK/nojson" "an unparseable marketplace is an error"

mkdir -p "$WORK/nomarket"
expect 2 "$WORK/nomarket" "an absent marketplace is an error"

if [ "$fails" -eq 0 ]; then
  echo "manifest-check bench: all cases passed"
else
  echo "manifest-check bench: $fails case(s) failed"
  exit 1
fi
