#!/usr/bin/env bash
# Usage: test-keys-check.sh [path-to-keys-check.py]
# Every refusal case was watched failing on a mutant of keys-check.py or of a GhSolo rule, because a case that passes on every script cannot tell a working one from a broken one.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="${1:-$HERE/keys-check.py}"
TREE="$(mktemp -d)"
trap 'rm -rf "$TREE"' EXIT

# WHY: the stub serves the body with shell builtins alone, because the no-Vale PATHs hold no cat, and it refuses the wrong subcommand so a script that fetched an issue for a pull request fails.
mkdir -p "$TREE/gh" "$TREE/novale" "$TREE/oldvale"
printf '#!/bin/sh\nif [ -n "$GH_FAIL" ]; then echo "gh: HTTP 404" >&2; exit 1; fi\nif [ "$1 $2" != "$WANT_KIND view" ]; then echo "stub: got $1 $2" >&2; exit 3; fi\nwhile IFS= read -r line || [ -n "$line" ]; do printf "%%s\\n" "$line"; done < "$BODY"\n' > "$TREE/gh/gh"
chmod +x "$TREE/gh/gh"
for dir in novale oldvale; do
    ln -s "$(command -v python3)" "$TREE/$dir/python3"
    ln -s "$TREE/gh/gh" "$TREE/$dir/gh"
done
printf '#!/bin/sh\nif [ "$1" = --version ]; then echo "vale version 3.22.0"; else echo "{}"; fi\n' > "$TREE/oldvale/vale"
chmod +x "$TREE/oldvale/vale"
export BODY="$TREE/body.md"

ISSUE='> a disclaimer

## Overview

What it does.

## Acceptance criteria

- [ ] ::AC1:: It refuses.
- [x] ::AC2:: It passes.
- ::AC3:: removed - superseded by AC2
- [ ] ::AC4::READ:: It reads well.

```markdown
- [ ] a criterion quoted in a fence
```

## Technical notes

- ::N1:: **A note.** About AC1.

## Dependencies

- Blocked by #1.'
EPIC='## What this delivers

A feature.

## Acceptance criteria

- [ ] ::AC1:: It works.

## Done when

- [ ] ::D1:: Every child is closed.'
PR='> a disclaimer

Closes #50

## Plan overview

- an unkeyed bullet in a section no key labels

## Steps

- [x] ::S1:: Write it.
- [ ] ::S2:: Test it.

## Verification

- [ ] ::V1:: `npm test`

What the gates cannot see.

## Open questions

None.

## Settled

- ::Q1:: Which form? The login one.'
fails=0

# run <kind> <content> [PATH]: sets got and out
run() {
    local kind="$1" content="$2" path="${3:-$TREE/gh:$PATH}"
    printf '%s\n' "$content" > "$BODY"
    got=0
    out="$(WANT_KIND="$kind" PATH="$path" python3 "$SCRIPT" "$kind" 7 2> /dev/null)" || got=$?
}

# check <name> <wanted exit code> <kind> <content> [PATH]
check() {
    run "$3" "$4" "${5:-$TREE/gh:$PATH}"
    if [[ "$got" == "$2" ]]; then
        echo "  ok   $1"
    else
        echo "  FAIL $1: exit $got, want $2"
        fails=$((fails + 1))
    fi
}

# says <name> <kind> <content> <line wanted in the output>
says() {
    run "$2" "$3"
    if grep -qxF -- "$4" <<< "$out"; then
        echo "  ok   $1"
    else
        echo "  FAIL $1: printed [$out]"
        fails=$((fails + 1))
    fi
}

echo "a body with every item keyed passes:"
check "an issue, with a removed line, a READ marker and a fenced item" 0 issue "$ISSUE"
check "an epic" 0 issue "$EPIC"
check "a pull request body, checkboxes and None. included" 0 pr "$PR"
check "a CRLF issue" 0 issue "${ISSUE//$'\n'/$'\r\n'}"

echo "an issue item without its section's key fails:"
check "an unkeyed criterion" 1 issue "${ISSUE/'- [ ] ::AC1:: It refuses.'/'- [ ] It refuses.'}"
check "a criterion keyed as a note" 1 issue "${ISSUE/'::AC1::'/'::N2::'}"
check "an unkeyed note" 1 issue "${ISSUE/'- ::N1:: '/'- '}"
check "an unkeyed Done when item" 1 issue "${EPIC/'::D1:: '/}"
UNKEYED="${ISSUE/'- [ ] ::AC1:: It refuses.'/'- [ ] It refuses.'}"
check "an unkeyed CRLF criterion" 1 issue "${UNKEYED//$'\n'/$'\r\n'}"

echo "an issue key opening two items fails:"
check "a repeated criterion key" 1 issue "${ISSUE/'::AC2::'/'::AC1::'}"
check "a repeated note key" 1 issue "${ISSUE/'- ::N1:: **A note.** About AC1.'/'- ::N1:: One.
- ::N1:: Two.'}"
check "a repeated Done when key" 1 issue "${EPIC/'- [ ] ::D1:: Every child is closed.'/'- [ ] ::D1:: One.
- [ ] ::D1:: Two.'}"

echo "a pull request item without its section's key fails:"
check "an unkeyed step" 1 pr "${PR/'::S2:: '/}"
check "an unkeyed gate" 1 pr "${PR/'::V1:: '/}"
check "an unkeyed question" 1 pr "${PR/'None.'/'- Which form?'}"

echo "a pull request key opening two items fails:"
check "a repeated step key" 1 pr "${PR/'::S2::'/'::S1::'}"
check "a question left open after its move" 1 pr "${PR/'None.'/'- ::Q1:: Which form?'}"

echo "each problem names its row and its items:"
says "an unkeyed item is tagged unkeyed, with its line" issue "$UNKEYED" "unkeyed: line 9: - [ ] It refuses."
says "a repeat names every item the key opens, the first included" issue "${ISSUE/'::AC2::'/'::AC1::'}" "repeated: AC1 opens 2 items: line 9: - [ ] ::AC1:: It refuses.; line 10: - [x] ::AC1:: It passes."
says "a key quoted in a fence is not one of its items" issue "${ISSUE/'- [ ] a criterion quoted in a fence'/'- [ ] ::AC1:: quoted'}"$'\n- [ ] ::AC1:: late' "repeated: AC1 opens 2 items: line 9: - [ ] ::AC1:: It refuses.; line 25: - [ ] ::AC1:: late"

echo "a body that cannot be checked is never a clean result:"
GH_FAIL=1 check "a fetch that fails" 2 issue "$ISSUE"
check "vale absent" 2 issue "$ISSUE" "$TREE/novale"
check "vale older than the minimum" 2 issue "$ISSUE" "$TREE/oldvale"

echo
echo "$fails failure(s)"
exit $((fails > 0))
