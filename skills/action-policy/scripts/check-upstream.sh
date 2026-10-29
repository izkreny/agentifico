#!/usr/bin/env bash
# Re-fetch the Action Policy documentation bundle this skill was written from and
# report whether upstream has changed since the snapshot in assets/.
#
# Exit 0: unchanged. Exit 1: changed, and the diff is printed. Exit 2: could not check.

set -euo pipefail

SOURCE_URL="https://actionpolicy.evilmartians.io/llms-full.txt"

skill_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
snapshot="$skill_dir/assets/llms-full.txt"

if ! command -v curl >/dev/null; then
  echo "check-upstream: curl is required and was not found" >&2
  exit 2
fi

if [ ! -f "$snapshot" ]; then
  echo "check-upstream: no snapshot at $snapshot" >&2
  exit 2
fi

fetched=$(mktemp) || exit 2
trap 'rm -f "$fetched"' EXIT

if ! curl -sSL --fail --max-time 120 "$SOURCE_URL" -o "$fetched"; then
  echo "check-upstream: could not fetch $SOURCE_URL" >&2
  exit 2
fi

# A truncated or error-page response would otherwise diff as a total rewrite and
# read as "upstream changed everything", which is the wrong conclusion to draw.
fetched_lines=$(wc -l < "$fetched")
if [ "$fetched_lines" -lt 100 ]; then
  echo "check-upstream: fetched only $fetched_lines lines, which is not the bundle" >&2
  exit 2
fi

# WHY: one snapshot covers the docs only while every page the bundle links is also embedded, so that is checked rather than assumed.
# WHY: each grep takes `|| true`, since under pipefail one that matches nothing would end the script with exit 1, which reads as "upstream changed".
embedded=$({ grep -o '^url: .*' "$fetched" || true; } |
  sed 's|^url: ||; s|.*/||' | sort -u)

if [ -z "$embedded" ]; then
  echo "check-upstream: the fetched bundle carries no 'url:' markers, so its structure changed and the coverage check cannot run" >&2
  exit 2
fi

linked=$({ grep -oE '\]\([^)]+\)|^\[[^]]+\]:[[:space:]]*[^[:space:]]+' "$fetched" || true; } |
  sed -E 's/^\]\(//; s/\)$//; s/^\[[^]]+\]:[[:space:]]*//; s/[[:space:]].*//; s/#.*//' |
  { grep -v '://' || true; } | { grep '\.md$' || true; } | sed 's|.*/||' | sort -u)
uncovered=$(comm -23 <(printf '%s\n' "$linked") <(printf '%s\n' "$embedded"))

status=0

if [ -n "$uncovered" ]; then
  echo "UNCOVERED: the bundle links pages it does not embed, so it is no longer the whole docs"
  printf '%s\n' "$uncovered" | sed 's|^|  |'
  echo "Fetch each of those separately into assets/ and widen this check."
  echo
  status=1
fi

if diff -q "$snapshot" "$fetched" >/dev/null; then
  echo "unchanged: upstream matches the snapshot ($(wc -l < "$snapshot") lines, $(printf '%s\n' "$embedded" | wc -l) pages embedded)"
  exit "$status"
fi

echo "CHANGED: upstream differs from the snapshot"
echo
diff -u "$snapshot" "$fetched" || true
echo
echo "Read the diff before refreshing: a changed bundle may contradict a claim the"
echo "skill states, and refreshing the snapshot without fixing the prose hides that."
echo "When the prose is right again:"
echo
echo "  curl -sSL '$SOURCE_URL' -o '$snapshot'"
exit 1
