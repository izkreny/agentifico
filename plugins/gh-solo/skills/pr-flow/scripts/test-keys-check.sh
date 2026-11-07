#!/usr/bin/env bash
# Usage: test-keys-check.sh [path-to-keys-check.py]
# Every refusal case was watched failing on a mutant of keys-check.py or of a GhSolo rule, because a case that passes on every script cannot tell a working one from a broken one.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="${1:-$HERE/keys-check.py}"
TREE="$(mktemp -d)"
trap 'rm -rf "$TREE"' EXIT

mkdir -p "$TREE/novale" "$TREE/oldvale"
# WHY: a PATH holding python3 alone is how a machine without Vale is faked, since the real Vale sits beside python3 on this one.
ln -s "$(command -v python3)" "$TREE/novale/python3"
ln -s "$(command -v python3)" "$TREE/oldvale/python3"
printf '#!/bin/sh\nif [ "$1" = --version ]; then echo "vale version 3.22.0"; else echo "{}"; fi\n' > "$TREE/oldvale/vale"
chmod +x "$TREE/oldvale/vale"

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

# check <name> <wanted exit code> <content> [PATH] [filename]
check() {
    local name="$1" want="$2" content="$3" path="${4:-$PATH}" file="$TREE/${5:-body.md}" got=0
    printf '%s\n' "$content" > "$file"
    PATH="$path" python3 "$SCRIPT" "$file" > /dev/null 2>&1 || got=$?
    rm -f "$file"
    if [[ "$got" == "$want" ]]; then
        echo "  ok   $name"
    else
        echo "  FAIL $name: exit $got, want $want"
        fails=$((fails + 1))
    fi
}

echo "a body with every item keyed passes:"
check "an issue, with a removed line, a READ marker and a fenced item" 0 "$ISSUE"
check "an epic" 0 "$EPIC"
check "a pull request body, checkboxes and None. included" 0 "$PR"
check "a CRLF issue" 0 "${ISSUE//$'\n'/$'\r\n'}"

echo "an issue item without its section's key fails:"
check "an unkeyed criterion" 1 "${ISSUE/'- [ ] ::AC1:: It refuses.'/'- [ ] It refuses.'}"
check "a criterion keyed as a note" 1 "${ISSUE/'::AC1::'/'::N2::'}"
check "an unkeyed note" 1 "${ISSUE/'- ::N1:: '/'- '}"
check "an unkeyed Done when item" 1 "${EPIC/'::D1:: '/}"
UNKEYED="${ISSUE/'- [ ] ::AC1:: It refuses.'/'- [ ] It refuses.'}"
check "an unkeyed CRLF criterion" 1 "${UNKEYED//$'\n'/$'\r\n'}"

echo "an issue key opening two items fails:"
check "a repeated criterion key" 1 "${ISSUE/'::AC2::'/'::AC1::'}"
check "a repeated note key" 1 "${ISSUE/'- ::N1:: **A note.** About AC1.'/'- ::N1:: One.
- ::N1:: Two.'}"
check "a repeated Done when key" 1 "${EPIC/'- [ ] ::D1:: Every child is closed.'/'- [ ] ::D1:: One.
- [ ] ::D1:: Two.'}"

echo "a pull request item without its section's key fails:"
check "an unkeyed step" 1 "${PR/'::S2:: '/}"
check "an unkeyed gate" 1 "${PR/'::V1:: '/}"
check "an unkeyed question" 1 "${PR/'None.'/'- Which form?'}"

echo "a pull request key opening two items fails:"
check "a repeated step key" 1 "${PR/'::S2::'/'::S1::'}"
check "a question left open after its move" 1 "${PR/'None.'/'- ::Q1:: Which form?'}"

echo "a file Vale cannot check is never a clean result:"
check "a body not ending in .md" 2 "$ISSUE" "$PATH" "body.txt"
check "vale absent" 2 "$ISSUE" "$TREE/novale"
check "vale older than the minimum" 2 "$ISSUE" "$TREE/oldvale"

echo
echo "$fails failure(s)"
exit $((fails > 0))
