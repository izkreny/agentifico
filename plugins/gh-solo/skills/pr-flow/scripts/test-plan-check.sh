#!/usr/bin/env bash
# Usage: test-plan-check.sh [path-to-plan-check.py]
# Every case was watched failing on a mutant of plan-check.py or of a GhSolo rule, because a case that passes on every script cannot tell a working one from a broken one.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="${1:-$HERE/plan-check.py}"
TREE="$(mktemp -d)"
trap 'rm -rf "$TREE"' EXIT

PLANS="$TREE/docs/plans"
mkdir -p "$PLANS" "$TREE/novale" "$TREE/oldvale"
# WHY: a PATH holding python3 alone is how a machine without Vale is faked, since the real Vale sits beside python3 on this one.
ln -s "$(command -v python3)" "$TREE/novale/python3"
ln -s "$(command -v python3)" "$TREE/oldvale/python3"
# WHY: the stub answers a lint run with a clean report, so a script that skipped the version check would pass the plan rather than fail on garbage.
printf '#!/bin/sh\nif [ "$1" = --version ]; then echo "vale version 3.22.0"; else echo "{}"; fi\n' > "$TREE/oldvale/vale"
chmod +x "$TREE/oldvale/vale"
# WHY: a Vale that passes the version check and dies on the lint run without a report, once with exit 1 and once killed, must not read as a clean run.
for how in 'exit 1' 'kill -9 $$'; do
    dir="$TREE/deadvale-${how%% *}"
    mkdir -p "$dir"
    ln -s "$(command -v python3)" "$dir/python3"
    printf '#!/bin/sh\nif [ "$1" = --version ]; then echo "vale version 3.23.0"; else echo "vale died" >&2; %s; fi\n' "$how" > "$dir/vale"
    chmod +x "$dir/vale"
done

NAME="2026-08-16_GHI-50_login-form.md"
GOOD='# Login form

## Steps

- Write the form.

## Verification

```bash
# a comment that is not a heading
npm test
```

- `npm test`

## Open questions

None.'
fails=0

# check <name> <wanted exit code> <filename> <content> [PATH]
check() {
    local name="$1" want="$2" file="$3" content="$4" path="${5:-$PATH}" got=0
    rm -f "$PLANS"/*
    printf '%s\n' "$content" > "$PLANS/$file"
    PATH="$path" python3 "$SCRIPT" "$PLANS/$file" > /dev/null 2>&1 || got=$?
    if [[ "$got" == "$want" ]]; then
        echo "  ok   $name"
    else
        echo "  FAIL $name: exit $got, want $want"
        fails=$((fails + 1))
    fi
}

echo "a plan with every required part passes:"
check "the clean plan" 0 "$NAME" "$GOOD"

echo "a missing required heading fails:"
check "no ## Steps" 1 "$NAME" "${GOOD/'## Steps'/'## Work'}"
check "no ## Verification" 1 "$NAME" "${GOOD/'## Verification'/'## Checks'}"

echo "a heading quoted inside a fence is not the section:"
FENCED_HEADING='# Login form

## Steps

- Write the form.

## Checks

```markdown
## Verification

- `npm test`
```

- `npm test`'
check "a fenced ## Verification" 1 "$NAME" "$FENCED_HEADING"
check "a fenced ## Steps" 1 "$NAME" "${GOOD/'## Steps'/'## Work

```markdown
## Steps
```'}"

echo "a ## Verification with no list item fails:"
check "only a fenced block and prose" 1 "$NAME" "${GOOD/'- `npm test`'/'Run it.'}"
NESTED='# Login form

## Steps

- Write the form.

## Verification

````markdown
```bash
# a comment that is not a heading
```
````

- `npm test`'
check "a list item after a nested fence" 0 "$NAME" "$NESTED"
check "a nested fence and no list item" 1 "$NAME" "${NESTED/'- `npm test`'/'Run it.'}"

echo "a checkbox fails in any section:"
check "in ## Steps" 1 "$NAME" "${GOOD/'- Write the form.'/'- [ ] Write the form.'}"
check "in ## Verification" 1 "$NAME" "${GOOD/'- `npm test`'/'- [x] `npm test`'}"
check "in another section" 1 "$NAME" "${GOOD/'None.'/'* [ ] None.'}"
check "inside a blockquote" 1 "$NAME" "${GOOD/'- Write the form.'/'> - [ ] Write the form.'}"

echo "a checkbox inside a fence is not a checkbox:"
check "quoted in a fence" 0 "$NAME" "${GOOD/'npm test
```'/'npm test
- [ ] Step 1
```'}"
check "quoted in a tilde fence" 0 "$NAME" "${GOOD/'None.'/'~~~
> - [x] None.
~~~'}"

echo "a filename off the pattern fails:"
check "no issue key" 1 "2026-08-16_login-form.md" "$GOOD"
check "an impossible date" 1 "2026-13-16_GHI-50_login-form.md" "$GOOD"
check "an uppercase slug" 1 "2026-08-16_GHI-50_Login-form.md" "$GOOD"

echo "a path Vale rewrites still reports:"
rm -f "$PLANS"/*
printf '%s\n' "${GOOD/'- Write the form.'/'- [ ] Write the form.'}" > "$PLANS/$NAME"
got=0
python3 "$SCRIPT" "$TREE/docs/../docs/plans/$NAME" > /dev/null 2>&1 || got=$?
if [[ "$got" == 1 ]]; then echo "  ok   a/../b"; else echo "  FAIL a/../b: exit $got, want 1"; fails=$((fails + 1)); fi

echo "the served repository's own Vale config is never read:"
printf 'StylesPath = nowhere\n[*.md]\nBasedOnStyles = Nope\n' > "$TREE/.vale.ini"
for want in 0 1; do
    rm -f "$PLANS"/*
    [[ "$want" == 0 ]] && content="$GOOD" || content="${GOOD/'- Write the form.'/'- [ ] Write the form.'}"
    printf '%s\n' "$content" > "$PLANS/$NAME"
    got=0
    (cd "$TREE" && python3 "$SCRIPT" "docs/plans/$NAME") > /dev/null 2>&1 || got=$?
    if [[ "$got" == "$want" ]]; then echo "  ok   beside a local .vale.ini, exit $want"; else echo "  FAIL beside a local .vale.ini: exit $got, want $want"; fails=$((fails + 1)); fi
done
rm "$TREE/.vale.ini"

echo "no usable Vale is never a clean result:"
check "vale absent" 2 "$NAME" "$GOOD" "$TREE/novale"
check "vale older than the minimum" 2 "$NAME" "$GOOD" "$TREE/oldvale"
check "vale dies on the lint run, exit 1" 2 "$NAME" "${GOOD/'## Verification'/'## Checks'}" "$TREE/deadvale-exit"
check "vale killed on the lint run" 2 "$NAME" "${GOOD/'## Verification'/'## Checks'}" "$TREE/deadvale-kill"

echo "no plan named is a usage error:"
got=0
python3 "$SCRIPT" < /dev/null > /dev/null 2>&1 || got=$?
if [[ "$got" == 2 ]]; then echo "  ok   no argument"; else echo "  FAIL no argument: exit $got, want 2"; fails=$((fails + 1)); fi

echo
echo "$fails failure(s)"
exit $((fails > 0))
