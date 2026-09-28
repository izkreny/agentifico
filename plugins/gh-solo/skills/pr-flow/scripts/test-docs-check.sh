#!/usr/bin/env bash
# Usage: test-docs-check.sh [path-to-docs-check.py]
# Every case was watched failing on a mutant of docs-check.py, because a case that passes on every script cannot tell a working one from a broken one.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="${1:-$HERE/docs-check.py}"
TREE="$(mktemp -d)"
trap 'rm -rf "$TREE"' EXIT

mkdir -p "$TREE/docs/plans"
fails=0

# check <name> <file under the tree> <its content> <wanted exit code>
check() {
    local name="$1" file="$2" content="$3" want="$4" got=0
    rm -f "$TREE/docs/plans/plan.md" "$TREE/README.md"
    printf '%s\n' "$content" > "$TREE/$file"
    python3 "$SCRIPT" "$TREE/$file" --plans "$TREE/docs/plans" --root "$TREE" > /dev/null 2>&1 || got=$?
    if [[ "$got" == "$want" ]]; then
        echo "  ok   $name"
    else
        echo "  FAIL $name: exit $got, want $want"
        fails=$((fails + 1))
    fi
}

echo "a plan's (new) span resolves:"
check "before the file exists" docs/plans/plan.md 'Write `lib/added.py` (new).' 0
mkdir -p "$TREE/lib" && touch "$TREE/lib/added.py"
check "after the file exists" docs/plans/plan.md 'Write `lib/added.py` (new).' 0
rm -rf "$TREE/lib"

echo "a plan's (delete) span resolves:"
touch "$TREE/gone.py"
check "before the file is removed" docs/plans/plan.md 'Remove `gone.py` (delete).' 0
rm "$TREE/gone.py"
check "after the file is removed" docs/plans/plan.md 'Remove `gone.py` (delete).' 0

echo "a directory span resolves under either tag:"
check "a new directory" docs/plans/plan.md 'Create `newdir/` (new).' 0
check "a deleted directory" docs/plans/plan.md 'Remove `olddir/` (delete).' 0

echo "outside a plan, a tagged span naming a missing path still fails:"
check "(delete) in a README" README.md 'See `gone.py` (delete).' 1
check "(new) in a README" README.md 'See `lib/added.py` (new).' 1

echo "an untagged span naming a missing path still fails:"
check "in a plan" docs/plans/plan.md 'Then edit `missing.py` again.' 1
check "in a README" README.md 'See `missing.py`.' 1
# WHY: the tag is exact so that a near miss reads as an untagged span rather than as intent.
check "a capitalised tag is no tag" docs/plans/plan.md 'Write `missing.py` (New).' 1
check "(modify) is no tag" docs/plans/plan.md 'Edit `missing.py` (modify).' 1

echo
echo "$fails failure(s)"
exit $((fails > 0))
