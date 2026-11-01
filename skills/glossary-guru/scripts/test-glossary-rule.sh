#!/usr/bin/env bash
# Regression bench for glossary-rule.py.
#
# WHY: a generated rule only proves something when Vale itself runs it, so the rule's cases go through Vale rather than through a read of the file.
set -euo pipefail

SCRIPT="$(cd "$(dirname "$0")" && pwd)/glossary-rule.py"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

command -v vale >/dev/null || { echo "test-glossary-rule: vale is not on PATH" >&2; exit 2; }

fails=0
pass() { echo "ok   - $1"; }
fail() { echo "FAIL - $1"; fails=$((fails + 1)); }

new_project() {
  PROJECT="$WORK/$1"
  mkdir -p "$PROJECT"
}

run_script() {
  (cd "$PROJECT" && python3 "$SCRIPT" .vale/styles >"$PROJECT/stdout" 2>"$PROJECT/stderr")
}

expect_exit() {
  local name="$1" want="$2" got=0
  run_script || got=$?
  if [ "$got" = "$want" ]; then pass "$name: exits $want"; else fail "$name: exits $got, wanted $want: $(cat "$PROJECT/stderr")"; fi
}

expect_refusal() {
  local name="$1" reason="$2"
  expect_exit "$name" 1
  if grep -qF "$reason" "$PROJECT/stderr"; then pass "$name: says '$reason'"; else fail "$name: stderr lacks '$reason': $(cat "$PROJECT/stderr")"; fi
  if [ -e "$PROJECT/.vale/styles/Glossary/Terms.yml" ]; then fail "$name: wrote a rule"; else pass "$name: wrote no rule"; fi
}

new_project full
mkdir -p "$PROJECT/docs"
cat >"$PROJECT/docs/GLOSSARY.md" <<'EOF'
# Shop

## Language

### Order

A customer's request to buy something.

_Avoid_: purchase, shopping basket

### Customer

A person who places orders.

_Avoid_: client, account

_Except_: take into account

### Refund

Money returned to a customer.

## Retired

- **Voucher**: a prepaid credit.

_Avoid_: coupon
EOF
cat >"$PROJECT/.vale.ini" <<'EOF'
StylesPath = .vale/styles
MinAlertLevel = suggestion

[*.{md,rb}]
BasedOnStyles = Glossary

[**/GLOSSARY.md]
Glossary.Terms = NO
EOF
cat >"$PROJECT/doc.md" <<'EOF'
# Probe

A PURCHASE here.

A shopping
basket there.

We take into account the clients and accounting.

A coupon and a Refund for a Customer who placed an Order.

The account stays.

Take into account the fee.

TAKE INTO ACCOUNT the fee.
EOF
cat >"$PROJECT/code.rb" <<'EOF'
# The client is held here.
def client
  "a client in a string"
end
EOF

expect_exit "a full glossary" 0
RULE="$PROJECT/.vale/styles/Glossary/Terms.yml"

# WHY: this one sets aside the exit code, since a warning leaves Vale at zero and the alerts themselves are the evidence.
(cd "$PROJECT" && vale --no-global --output=line . >"$PROJECT/alerts" 2>&1) || true

expect_alert() {
  local name="$1" line="$2"
  if grep -qxF "$line" "$PROJECT/alerts"; then pass "$name"; else fail "$name: '$line' not in: $(cat "$PROJECT/alerts")"; fi
}

expect_no_alert() {
  local name="$1" pattern="$2"
  if grep -qiE "$pattern" "$PROJECT/alerts"; then fail "$name: $(grep -iE "$pattern" "$PROJECT/alerts")"; else pass "$name"; fi
}

expect_alert "a drift word fires in any case, naming both words" "doc.md:3:3:Glossary.Terms:Use 'Order' instead of 'PURCHASE'."
expect_alert "a phrase on an Avoid line fires across a line break" "doc.md:5:3:Glossary.Terms:Use 'Order' instead of 'shopping basket'."
expect_alert "a word an exception does not cover still fires" "doc.md:12:5:Glossary.Terms:Use 'Customer' instead of 'account'."
expect_alert "a code comment fires" "code.rb:1:7:Glossary.Terms:Use 'Customer' instead of 'client'."
expect_no_alert "an Except phrase, a longer word and the terms stay quiet" "doc.md:(8|10|14|16):"
expect_no_alert "a method name and a string stay quiet" "code.rb:[2-9]:"
expect_no_alert "the glossary itself stays quiet" "GLOSSARY.md:"

quiet_exit=0
(cd "$PROJECT" && vale --no-global --output=line . >/dev/null 2>&1) || quiet_exit=$?
if [ "$quiet_exit" = 0 ]; then pass "a warning leaves a Vale run at zero"; else fail "a warning made Vale exit $quiet_exit"; fi

sed 's/^BasedOnStyles = Glossary$/&\nGlossary.Terms = error/' "$PROJECT/.vale.ini" >"$PROJECT/error.ini"
loud_exit=0
(cd "$PROJECT" && vale --no-global --config=error.ini --output=line doc.md >/dev/null 2>&1) || loud_exit=$?
if [ "$loud_exit" = 1 ]; then pass "the .vale.ini override makes a drifted word fail the run"; else fail "the .vale.ini override made Vale exit $loud_exit, wanted 1"; fi
clean_exit=0
(cd "$PROJECT" && vale --no-global --config=error.ini --output=line docs/GLOSSARY.md >/dev/null 2>&1) || clean_exit=$?
if [ "$clean_exit" = 0 ]; then pass "the override leaves the glossary alone"; else fail "the override made the glossary exit $clean_exit"; fi

first_lines="$(head -n 2 "$RULE")"
if [[ "$first_lines" == *"Generated"* && "$first_lines" == *"python3 <skill-dir>/scripts/glossary-rule.py .vale/styles"* ]]; then
  pass "the rule opens by saying it is generated, naming the command"
else
  fail "the rule's opening lines: $first_lines"
fi

cp "$RULE" "$WORK/first-run"
expect_exit "a second run" 0
if cmp -s "$RULE" "$WORK/first-run"; then pass "a second run is byte-identical"; else fail "a second run differs"; fi

new_project root
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Order

A request to buy.

_Avoid_: purchase
EOF
expect_exit "a glossary at the root" 0
if grep -q '"purchase": "Order"' "$PROJECT/.vale/styles/Glossary/Terms.yml"; then pass "a glossary at the root is read"; else fail "a glossary at the root is not read"; fi

new_project both
mkdir -p "$PROJECT/docs"
echo '## Language' >"$PROJECT/GLOSSARY.md"
echo '## Language' >"$PROJECT/docs/GLOSSARY.md"
expect_exit "a glossary at both paths" 2

new_project none
expect_exit "no glossary" 2

new_project quiet
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Order

A request to buy.
EOF
expect_exit "a glossary naming no drift word" 0
if [ -e "$PROJECT/.vale/styles/Glossary/Terms.yml" ]; then fail "a glossary naming no drift word wrote a rule"; else pass "a glossary naming no drift word writes no rule"; fi

new_project two-entries
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Order

A request to buy.

_Avoid_: purchase

### Sale

A completed purchase.

_Avoid_: Purchase
EOF
expect_refusal "a word on two entries" "no single replacement"

new_project a-term
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Member

A user's membership in one group.

_Avoid_: user

### User

A person's account.
EOF
expect_refusal "a word that is another entry's term" "is also an entry's term"

new_project metacharacter
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Issue

A tracked unit of work.

_Avoid_: ticket (when quoting)
EOF
expect_refusal "a word holding a metacharacter" "must be letters"

new_project trailing-comma
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Order

A request to buy.

_Avoid_: purchase,
EOF
expect_refusal "an empty word" "must be letters"

new_project no-heading
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

**Order**:
A request to buy.
_Avoid_: purchase
EOF
expect_refusal "an Avoid line under no heading" "belongs under an entry's ### heading"

if [ "$fails" -gt 0 ]; then
  echo "test-glossary-rule: $fails failure(s)"
  exit 1
fi
echo "test-glossary-rule: all passed"
