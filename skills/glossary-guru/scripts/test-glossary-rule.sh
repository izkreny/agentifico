#!/usr/bin/env bash
# Regression bench for glossary-rule.py.
#
# WHY: a generated rule only proves something when Vale itself runs it, so the rule's cases go through Vale rather than through a read of the file.
set -euo pipefail

SCRIPT="$(cd "$(dirname "$0")" && pwd)/glossary-rule.py"
TEMPLATE="$(cd "$(dirname "$0")/../assets" && pwd)/vale.ini.template"
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
  (cd "$PROJECT" && python3 "$SCRIPT" >"$PROJECT/stdout" 2>"$PROJECT/stderr")
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

**::AVOID::**: purchase, shopping basket

### Customer

A person who places orders.

**::AVOID::**: client, account

**::EXCEPT::**: take into account

### Refund

Money returned to a customer.
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
if [[ "$first_lines" == *"Generated"* && "$first_lines" == *"python3 <skill-dir>/scripts/glossary-rule.py" ]]; then
  pass "the rule opens by saying it is generated, naming the command"
else
  fail "the rule's opening lines: $first_lines"
fi

cp "$RULE" "$WORK/first-run"
expect_exit "a second run" 0
if cmp -s "$RULE" "$WORK/first-run"; then pass "a second run is byte-identical"; else fail "a second run differs"; fi

new_project multi-word
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Shopping Cart

What a customer is about to buy.

**::AVOID::**: cart

### Order Line

One thing on an order.

### Order

A request to buy.

**::AVOID::**: line
EOF
cat >"$PROJECT/.vale.ini" <<'EOF'
StylesPath = .vale/styles

[doc.md]
BasedOnStyles = Glossary
EOF
cat >"$PROJECT/doc.md" <<'EOF'
# Probe

A Shopping Cart and an order line here.

A cart stays.
EOF
expect_exit "a drift word inside a longer term" 0
(cd "$PROJECT" && vale --no-global --output=line doc.md >"$PROJECT/alerts" 2>&1) || true
expect_alert "a drift word alone still fires" "doc.md:5:3:Glossary.Terms:Use 'Shopping Cart' instead of 'cart'."
expect_no_alert "a term holding a drift word stays quiet" "doc.md:3:"

new_project case-pair
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Shopping Cart

What a customer is about to buy.

**::AVOID::**: cart

**::EXCEPT::**: shopping cart
EOF
expect_exit "a term and an Except entry differing only in case" 0
cp "$PROJECT/.vale/styles/Glossary/Terms.yml" "$WORK/case-pair-rule"
pair_differs=no
for seed in 1 2 3 4 5 6 7 8; do
  (cd "$PROJECT" && PYTHONHASHSEED="$seed" python3 "$SCRIPT" >/dev/null)
  cmp -s "$PROJECT/.vale/styles/Glossary/Terms.yml" "$WORK/case-pair-rule" || pair_differs=yes
done
if [ "$pair_differs" = no ]; then pass "a case-only pair regenerates byte-identically under any hash seed"; else fail "a case-only pair changes with the hash seed"; fi
pair_count="$(grep -ci '(?i)shopping cart' "$WORK/case-pair-rule" || true)"
if [ "$pair_count" = 1 ]; then pass "a case-only pair is written once"; else fail "a case-only pair is written $pair_count times"; fi

new_project sharp-s
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Bestellung

Was ein Kunde kauft.

**::AVOID::**: strasse

**::EXCEPT::**: Große Strasse, grosse strasse
EOF
cat >"$PROJECT/.vale.ini" <<'EOF'
StylesPath = .vale/styles

[doc.md]
BasedOnStyles = Glossary
EOF
cat >"$PROJECT/doc.md" <<'EOF'
# Probe

Die grosse strasse da.

Die Große Strasse da.

Eine strasse hier.
EOF
expect_exit "two phrases apart only under full case folding" 0
(cd "$PROJECT" && vale --no-global --output=line doc.md >"$PROJECT/alerts" 2>&1) || true
expect_no_alert "both phrases folding alike stay quiet" "doc.md:(3|5):"
expect_alert "a drift word beside them still fires" "doc.md:7:6:Glossary.Terms:Use 'Bestellung' instead of 'strasse'."

one_entry() {
  cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Order

A request to buy.

**::AVOID::**: purchase
EOF
}

expect_file() {
  if [ -f "$PROJECT/$2" ]; then pass "$1"; else fail "$1: $2 is missing"; fi
}

expect_no_file() {
  if [ -e "$PROJECT/$2" ]; then fail "$1: $2 exists"; else pass "$1"; fi
}

expect_stdout() {
  if grep -qxF "$2" "$PROJECT/stdout"; then pass "$1"; else fail "$1: stdout lacks '$2': $(cat "$PROJECT/stdout")"; fi
}

expect_no_stdout() {
  if grep -qF "$2" "$PROJECT/stdout"; then fail "$1: stdout holds '$2': $(cat "$PROJECT/stdout")"; else pass "$1"; fi
}

new_project no-config
one_entry
printf '# Probe\n\nA purchase here.\n' >"$PROJECT/doc.md"
expect_exit "a project with no Vale config" 0
expect_stdout "with no config the script says how to run the check" "glossary-rule: check the project from here with: vale $(cd "$PROJECT" && pwd -P)"
expect_file "no config: the rule lands under .vale/styles" .vale/styles/Glossary/Terms.yml
expect_file "no config: the script writes .vale.ini" .vale.ini
if cmp -s "$PROJECT/.vale.ini" "$TEMPLATE"; then pass "the written config is a copy of the template"; else fail "the written config differs from the template"; fi
(cd "$PROJECT" && vale --no-global --output=line . >"$PROJECT/alerts" 2>&1) || true
expect_alert "the written config turns the rule on" "doc.md:3:3:Glossary.Terms:Use 'Order' instead of 'purchase'."
expect_no_alert "the written config keeps the rule off the glossary" "GLOSSARY.md:"
for extension in js jsx mjs cjs ts tsx mts cts rs c h java go; do
  printf '// A purchase here.\n' >"$PROJECT/code.$extension"
done
printf '/* A purchase here. */\n' >"$PROJECT/code.css"
(cd "$PROJECT" && vale --no-global --output=line . >"$PROJECT/alerts" 2>&1) || true
for extension in js jsx mjs cjs ts tsx mts cts rs c h java go css; do
  expect_alert "the written config checks .$extension comments" "code.$extension:1:6:Glossary.Terms:Use 'Order' instead of 'purchase'."
done
for extension in py rb; do
  printf '# A purchase here.\n' >"$PROJECT/code.$extension"
done
(cd "$PROJECT" && vale --no-global --output=line . >"$PROJECT/alerts" 2>&1) || true
for extension in py rb; do
  expect_alert "the written config checks .$extension comments" "code.$extension:1:5:Glossary.Terms:Use 'Order' instead of 'purchase'."
done
cp "$PROJECT/.vale.ini" "$WORK/written-config"
expect_exit "a second run on the written config" 0
if cmp -s "$PROJECT/.vale.ini" "$WORK/written-config"; then pass "a second run leaves the written config alone"; else fail "a second run changed the written config"; fi
expect_no_stdout "a second run does not ask to add what the written config holds" "added to the list"

new_project template-name
cp "$TEMPLATE" "$PROJECT/"
printf 'A probe.\n' >"$PROJECT/doc.md"
template_exit=0
(cd "$PROJECT" && vale --no-global --output=line doc.md >"$PROJECT/alerts" 2>&1) || template_exit=$?
if [ "$template_exit" = 2 ] && grep -qF "E100" "$PROJECT/alerts"; then pass "Vale does not take the template for its config"; else fail "Vale took the template for its config: exit $template_exit: $(cat "$PROJECT/alerts")"; fi

new_project config-styles-path
one_entry
printf 'StylesPath = custom/styles\n\n[*.md]\nBasedOnStyles = Glossary\n\n[**/GLOSSARY.md]\nGlossary.Terms = NO\n' >"$PROJECT/.vale.ini"
cp "$PROJECT/.vale.ini" "$WORK/full-config"
expect_exit "a config naming a StylesPath" 0
expect_file "the rule lands under the config's StylesPath" custom/styles/Glossary/Terms.yml
expect_no_file "the rule stays out of the default path" .vale/styles
if cmp -s "$PROJECT/.vale.ini" "$WORK/full-config"; then pass "an existing config stays untouched"; else fail "an existing config changed"; fi

new_project config-quoted-path
one_entry
printf 'StylesPath = "quoted"\n\n[*.md]\nBasedOnStyles = Glossary\n' >"$PROJECT/.vale.ini"
expect_exit "a quoted StylesPath" 0
expect_file "a quoted StylesPath loses its quotes" quoted/Glossary/Terms.yml

new_project config-other-name
one_entry
printf 'StylesPath = styles\n\n[*.md]\nBasedOnStyles = Vale\n' >"$PROJECT/vale.ini"
cp "$PROJECT/vale.ini" "$WORK/other-config"
expect_exit "a config under another name Vale reads" 0
expect_file "the rule lands under that config's StylesPath" styles/Glossary/Terms.yml
expect_no_file "no second config appears beside it" .vale.ini
if cmp -s "$PROJECT/vale.ini" "$WORK/other-config"; then pass "that config stays untouched"; else fail "that config changed"; fi
expect_stdout "with a config the script says how to run the check" "glossary-rule: check the project from here with: vale $(cd "$PROJECT" && pwd -P)"
expect_stdout "the script prints the glossary section" "[**/GLOSSARY.md]"
expect_stdout "the script prints the glossary line" "Glossary.Terms = NO"
expect_no_stdout "the script prints no section for the project's own files" "[*."
expect_no_stdout "the script prints no BasedOnStyles line to clash with the project's" "BasedOnStyles ="
if grep -qF "the last section covering it that sets BasedOnStyles" "$PROJECT/stdout"; then pass "the script says which section the style goes in"; else fail "the script does not say which section: $(cat "$PROJECT/stdout")"; fi
if grep -qF "MinAlertLevel" "$PROJECT/stdout" && grep -qF "Glossary.Terms = error" "$PROJECT/stdout"; then pass "the script says what a raised alert level hides"; else fail "the script does not name the alert level: $(cat "$PROJECT/stdout")"; fi
expect_no_stdout "the script does not ask for a StylesPath the config has" "StylesPath ="

new_project config-own-style
one_entry
mkdir -p "$PROJECT/styles/Other"
printf 'extends: substitution\nmessage: "Use '"'"'%%s'"'"' instead of '"'"'%%s'"'"'."\nlevel: warning\nswap:\n  fee: Charge\n' >"$PROJECT/styles/Other/Fees.yml"
printf '# Probe\n\nA purchase and a fee.\n' >"$PROJECT/doc.md"
printf 'StylesPath = styles\n\n[*.md]\nBasedOnStyles = Other\n' >"$PROJECT/.vale.ini"
expect_exit "a config with its own style" 0
printf 'StylesPath = styles\n\n[*.md]\nBasedOnStyles = Other, Glossary\n\n[**/GLOSSARY.md]\nGlossary.Terms = NO\n' >"$PROJECT/.vale.ini"
(cd "$PROJECT" && vale --no-global --output=line . >"$PROJECT/alerts" 2>&1) || true
expect_alert "with the printed lines the rule fires" "doc.md:3:3:Glossary.Terms:Use 'Order' instead of 'purchase'."
expect_alert "with the printed lines the project's own style still fires" "doc.md:3:18:Other.Fees:Use 'Charge' instead of 'fee'."
expect_no_alert "with the printed lines the glossary stays quiet" "GLOSSARY.md:"

new_project parent-config/sub
one_entry
printf 'StylesPath = styles\n\n[*.md]\nBasedOnStyles = Glossary\n\n[**/GLOSSARY.md]\nGlossary.Terms = NO\n' >"$PROJECT/../.vale.ini"
expect_exit "a config in a parent directory" 2
if grep -qF "add a config here" "$PROJECT/stderr"; then pass "a parent's config: the refusal says what to do"; else fail "a parent's config: stderr: $(cat "$PROJECT/stderr")"; fi
if grep -qF "run this from" "$PROJECT/stderr"; then fail "a parent's config: the refusal offers a route that refuses again: $(cat "$PROJECT/stderr")"; else pass "a parent's config: the refusal offers only what works"; fi
expect_no_file "a parent's config gets no second config below it" .vale.ini
expect_no_file "a parent's config gets no shared rule" ../styles

new_project config-inline-comment
one_entry
printf 'StylesPath = cmt # the styles\n\n[*.md]\nBasedOnStyles = Glossary\n' >"$PROJECT/.vale.ini"
expect_exit "a StylesPath with an inline comment" 0
expect_file "the comment is not part of the path" cmt/Glossary/Terms.yml

new_project config-named-vale
one_entry
printf '[*.md]\nBasedOnStyles = Glossary\n' >"$PROJECT/.vale"
expect_exit "a config file named .vale with no StylesPath" 2
if grep -qF "cannot write" "$PROJECT/stderr" && ! grep -qF "Traceback" "$PROJECT/stderr"; then pass "that config gets a reason, not a traceback"; else fail "that config's stderr: $(cat "$PROJECT/stderr")"; fi

new_project quoted-word
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Order

A request to buy.

**::AVOID::**: 'purchase'
EOF
expect_refusal "a single-quoted word" "a straight apostrophe after a letter"

new_project quote-at-the-end
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Order

A request to buy.

**::AVOID::**: purchase'
EOF
expect_refusal "a quote mark closing a word" "more of the phrase after it"

new_project quoted-part
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Order

A request to buy.

**::AVOID::**: big 'order'
EOF
expect_refusal "a quoted word inside a phrase" "a straight apostrophe after a letter"

new_project possessive-word
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Order

A request to buy.

**::AVOID::**: customer's purchase
EOF
expect_exit "an apostrophe inside a word" 0

new_project possessive-phrase
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Customer

A person who buys.

**::AVOID::**: ledger, customers' purchase

**::EXCEPT::**: customers' ledger

### Customers' Book

What a shop keeps on them.

**::AVOID::**: book
EOF
printf "# Probe\n\nThe customers' purchase here.\n\nThe customers' ledger here.\n\nThe customers' book here.\n" >"$PROJECT/doc.md"
expect_exit "a plural possessive inside a phrase" 0
(cd "$PROJECT" && vale --no-global --output=line doc.md >"$PROJECT/alerts" 2>&1) || true
expect_alert "a possessive phrase on an Avoid line fires" "doc.md:3:5:Glossary.Terms:Use 'Customer' instead of 'customers' purchase'."
expect_no_alert "a possessive phrase on an Except line and in a term stays quiet" "doc.md:(5|7):"

new_project config-colon
one_entry
printf 'StylesPath: col\n\n[*.md]\nBasedOnStyles: Glossary\n\n[**/GLOSSARY.md]\nGlossary.Terms: NO\n' >"$PROJECT/.vale.ini"
expect_exit "a config using colons" 0
expect_file "a colon sets the StylesPath too" col/Glossary/Terms.yml

new_project config-no-styles-path
one_entry
printf '[*.md]\nBasedOnStyles = Glossary\n\n[**/GLOSSARY.md]\nGlossary.Terms = NO\n' >"$PROJECT/.vale.ini"
expect_exit "a config naming no StylesPath" 0
expect_file "with no StylesPath the rule lands under .vale/styles" .vale/styles/Glossary/Terms.yml
expect_stdout "the script prints the StylesPath line to add" "StylesPath = .vale/styles"

new_project two-configs
one_entry
printf 'StylesPath = a\n' >"$PROJECT/.vale.ini"
printf 'StylesPath = b\n' >"$PROJECT/vale.ini"
expect_exit "two configs" 2
if grep -qF "vale.ini" "$PROJECT/stderr"; then pass "two configs: the refusal names them"; else fail "two configs: stderr: $(cat "$PROJECT/stderr")"; fi
expect_no_file "two configs: no rule is written" a

new_project refused-no-config
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Order

A request to buy.

**::AVOID::**: purchase

### Refund

Money returned.

**::AVOID::**: purchase
EOF
expect_refusal "a refused glossary with no config" "no single replacement"
expect_no_file "a refusal writes no config" .vale.ini

new_project an-argument
one_entry
arg_exit=0
(cd "$PROJECT" && python3 "$SCRIPT" somewhere >/dev/null 2>&1) || arg_exit=$?
if [ "$arg_exit" = 2 ]; then pass "an argument exits 2"; else fail "an argument exits $arg_exit, wanted 2"; fi
expect_no_file "an argument writes nothing" somewhere

new_project term-metacharacter
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Shopping Cart (legacy)

What a customer was about to buy.

**::AVOID::**: cart
EOF
expect_refusal "a term holding a drift word and a metacharacter" "must be letters"

new_project term-no-space
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Pre-Order

An order placed before release.

### Purchase

A request to buy.

**::AVOID::**: order
EOF
expect_refusal "a term with no space holding a drift word" "holds no space"

new_project except-no-space
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Purchase

A request to buy.

**::AVOID::**: order

**::EXCEPT::**: pre-order
EOF
expect_refusal "an Except entry with no space" "holds no space"

new_project root
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Order

A request to buy.

**::AVOID::**: purchase
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

new_project option
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Order

A request to buy.

**::AVOID::**: purchase
EOF
option_exit=0
(cd "$PROJECT" && python3 "$SCRIPT" --help >/dev/null 2>&1) || option_exit=$?
if [ "$option_exit" = 2 ]; then pass "an option exits 2"; else fail "an option exits $option_exit, wanted 2"; fi
if [ -e "$PROJECT/--help" ]; then fail "an option was taken as a styles path"; else pass "an option writes nothing"; fi

new_project quiet
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Order

A request to buy.
EOF
expect_exit "a glossary naming no drift word" 0
if grep -qx 'swap: {}' "$PROJECT/.vale/styles/Glossary/Terms.yml" 2>/dev/null; then pass "a glossary naming no drift word writes a rule that swaps nothing"; else fail "a glossary naming no drift word wrote no empty rule"; fi

new_project stale
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Order

A request to buy.

**::AVOID::**: purchase
EOF
expect_exit "a glossary before its last drift word goes" 0
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Order

A request to buy.
EOF
expect_exit "a glossary after its last drift word went" 0
cat >"$PROJECT/.vale.ini" <<'EOF'
StylesPath = .vale/styles

[doc.md]
BasedOnStyles = Glossary
EOF
echo 'A purchase here.' >"$PROJECT/doc.md"
# WHY: git tracks no empty directory, so only a rule file keeps the Glossary style on a fresh checkout's StylesPath.
if git -C "$PROJECT" init -q && git -C "$PROJECT" add -A && [ -n "$(git -C "$PROJECT" ls-files .vale/styles/Glossary)" ]; then pass "the Glossary style survives a checkout"; else fail "git tracks nothing under the Glossary style"; fi
stale_exit=0
(cd "$PROJECT" && vale --no-global --output=line doc.md >"$PROJECT/alerts" 2>&1) || stale_exit=$?
if [ "$stale_exit" = 0 ] && [ ! -s "$PROJECT/alerts" ]; then pass "the rule stops firing with the glossary's last drift word"; else fail "Vale exits $stale_exit after the last drift word went: $(cat "$PROJECT/alerts")"; fi

new_project two-entries
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Order

A request to buy.

**::AVOID::**: purchase

### Sale

A completed purchase.

**::AVOID::**: Purchase
EOF
expect_refusal "a word on two entries" "no single replacement"

new_project a-term
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Member

A user's membership in one group.

**::AVOID::**: user

### User

A person's account.
EOF
expect_refusal "a word that is another entry's term" "is also an entry's term"

new_project metacharacter
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Issue

A tracked unit of work.

**::AVOID::**: ticket (when quoting)
EOF
expect_refusal "a word holding a metacharacter" "must be letters"

new_project trailing-comma
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Order

A request to buy.

**::AVOID::**: purchase,
EOF
expect_refusal "an empty word" "must be letters"
if grep -qF "holds a drift word" "$PROJECT/stderr"; then fail "a refused word reached a later check: $(cat "$PROJECT/stderr")"; else pass "a refused word reaches no later check"; fi

new_project no-heading
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

**Order**:
A request to buy.
**::AVOID::**: purchase
EOF
expect_refusal "an Avoid line under no heading" "belongs under an entry's ### heading"

glossary_under() {
  printf '%b\n\n### Order\n\nA request to buy.\n\n**::AVOID::**: purchase\n' "$1" >"$PROJECT/GLOSSARY.md"
}

entry_with_line() {
  printf '## Language\n\n### Order\n\nA request to buy.\n\n%s\n' "$1" >"$PROJECT/GLOSSARY.md"
}

expect_rule_holds() {
  if grep -qF "$2" "$PROJECT/.vale/styles/Glossary/Terms.yml" 2>/dev/null; then pass "$1"; else fail "$1: the rule lacks '$2'"; fi
}

expect_clean_stop() {
  local name="$1" reason="$2"
  expect_exit "$name" 2
  if grep -qF "$reason" "$PROJECT/stderr" && ! grep -qF "Traceback" "$PROJECT/stderr"; then pass "$name: says '$reason'"; else fail "$name: stderr: $(cat "$PROJECT/stderr")"; fi
  expect_no_file "$name: no rule is written" .vale/styles/Glossary/Terms.yml
}

count=0
for heading in '##  Language' '## Language ##' '## language' '##\tLanguage' '\xef\xbb\xbf## Language'; do
  count=$((count + 1))
  new_project heading-$count
  glossary_under "$heading"
  expect_exit "the heading '$heading'" 0
  expect_rule_holds "the heading '$heading' opens the section" '"purchase": "Order"'
done

count=0
for heading in '## Language:' '# Language' 'Language\n--------' '## Terms'; do
  count=$((count + 1))
  new_project no-language-$count
  glossary_under "$heading"
  expect_refusal "list lines under '$heading'" "only a list line under ## Language may hold a marker"
done

new_project retired-only
printf '# Shop\n\n## Retired\n\n- **Voucher**: a prepaid credit.\n' >"$PROJECT/GLOSSARY.md"
expect_exit "a glossary with no list lines and no Language section" 0

new_project other-heading
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Order

A request to buy.

## Language notes

**::AVOID::**: purchase
EOF
expect_refusal "a list line under a heading that only starts with the section's name" "line 9: only a list line under ## Language may hold a marker"

new_project flagged-list-line
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Order

A request to buy.

**::AVOID::**: purchase

## Flagged ambiguities

### Refund

**::AVOID::**: reimbursement
EOF
expect_refusal "a list line appended after the Language section" "line 13: only a list line under ## Language may hold a marker"

new_project flagged-prose
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Order

A request to buy.

**::AVOID::**: purchase

## Flagged ambiguities

- "basket" now sits on the **::AVOID::**: line of Order.
EOF
expect_refusal "prose naming a marker outside the Language section" "line 11: only a list line under ## Language may hold a marker"

count=0
for line in '::AVOID:: purchase' '**::AVOID::** purchase' '**::AVOID::** : purchase' '*::AVOID::*: purchase' '**::avoid::**: purchase' '- **::AVOID::**: purchase' '> **::AVOID::**: purchase' 'A request. **::AVOID::**: purchase' '**::EXCEPT::** in the long run'; do
  count=$((count + 1))
  new_project near-miss-$count
  entry_with_line "$line"
  expect_refusal "the line '$line'" "is written **::AVOID::**: or **::EXCEPT::**: on a line of its own"
done

count=0
for line in 'Customers avoid this, except at the till.' 'A request to buy, *except* a refund.' 'A request to buy, _except_ a refund.' 'A request to buy, **except** a refund.' 'Customers must *avoid* this one.' 'A request, written `_Avoid_` nowhere.' 'A request. See _except for_ the rest.' '*avoid_this* is a name in the code.' '*Except for refunds*, an order is final.' '*Avoid this word* in invoices.' '*avoid-this* is a name.' '`avoid-list` is a name.' 'Avoid: a word to leave out of the prose.' '*Avoid purchase*' '_Avoid_ purchase'; do
  count=$((count + 1))
  new_project plain-prose-$count
  entry_with_line "$line"
  expect_exit "the definition '$line'" 0
done

new_project retired-prose
printf '# Shop\n\n## Retired\n\n- **Voucher**: a prepaid credit, *except* gift ones.\n' >"$PROJECT/GLOSSARY.md"
expect_exit "an emphasised except outside the Language section" 0

new_project retired-phrase
printf '# Shop\n\n## Notes\n\n*Except for refunds*, an order is final.\n' >"$PROJECT/GLOSSARY.md"
expect_exit "an emphasised phrase opening a line outside the Language section" 0

new_project term-closing-hashes
printf '## Language\n\n### Order ###\n\nA request to buy.\n\n**::AVOID::**: purchase\n' >"$PROJECT/GLOSSARY.md"
expect_exit "a term heading with closing hashes" 0
expect_rule_holds "closing hashes stay out of the term" '"purchase": "Order"'

new_project term-tab
printf '## Language\n\n###\tOrder\n\nA request to buy.\n\n**::AVOID::**: purchase\n' >"$PROJECT/GLOSSARY.md"
expect_exit "a term heading with a tab" 0
expect_rule_holds "a tab still opens an entry" '"purchase": "Order"'

new_project hand-written-rule
one_entry
mkdir -p "$PROJECT/.vale/styles/Glossary"
printf 'extends: substitution\nmessage: "hand-written"\nswap:\n  fee: Charge\n' >"$PROJECT/.vale/styles/Glossary/Terms.yml"
cp "$PROJECT/.vale/styles/Glossary/Terms.yml" "$WORK/hand-written"
expect_exit "a rule file this script did not write" 2
if grep -qF "did not write" "$PROJECT/stderr"; then pass "that refusal says why"; else fail "that refusal's stderr: $(cat "$PROJECT/stderr")"; fi
if cmp -s "$PROJECT/.vale/styles/Glossary/Terms.yml" "$WORK/hand-written"; then pass "a hand-written rule stays as it was"; else fail "a hand-written rule was replaced"; fi
expect_no_file "that refusal writes no config" .vale.ini

count=0
for fence in '```' '```markdown' '~~~' '    ```' '```order``` is a request.'; do
  count=$((count + 1))
  new_project code-fence-$count
  entry_with_line "$fence"
  expect_refusal "the line '$fence'" "a glossary holds no code fence"
done

new_project code-fence-elsewhere
printf '# Shop\n\n```\n\n## Language\n\n### Order\n\nA request to buy.\n\n_Avoid_ nothing.\n' >"$PROJECT/GLOSSARY.md"
expect_refusal "a code fence above the section" "a glossary holds no code fence"

count=0
for term in 'Order (legacy)' '"Order"' "'Order'" 'C#' 'Customer’s Book'; do
  count=$((count + 1))
  new_project plain-term-$count
  printf '## Language\n\n### %s\n\nA request to buy.\n' "$term" >"$PROJECT/GLOSSARY.md"
  expect_refusal "the term '$term'" "must be letters"
done

new_project apostrophe-term
printf "## Language\n\n### Order's Line\n\nOne thing on an order.\n" >"$PROJECT/GLOSSARY.md"
expect_exit "a term holding an apostrophe" 0

new_project quoted-definition
printf '## Language\n\n### Order\n\nA "request" to buy, written `like this`.\n' >"$PROJECT/GLOSSARY.md"
expect_exit "a definition holding quotes and a code span" 0

new_project sharp-s-term
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Straße

Ein Weg.

**::AVOID::**: Strasse
EOF
expect_exit "a drift word equal to a term only under full case folding" 0

new_project sharp-s-pair
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Weg

Ein Weg.

**::AVOID::**: Straße

### Pfad

Ein Pfad.

**::AVOID::**: Strasse
EOF
expect_exit "two drift words equal only under full case folding" 0

new_project curly-apostrophe
entry_with_line '**::AVOID::**: customer’s purchase'
expect_refusal "a curly apostrophe" "a straight apostrophe"

new_project except-typo
cat >"$PROJECT/GLOSSARY.md" <<'EOF'
## Language

### Customer

A person who buys.

**::AVOID::**: account

**::EXCEPT::**: on acount of
EOF
expect_refusal "an Except phrase holding no drift word" "holds no word from any **::AVOID::**: line"

new_project unbalanced-word
entry_with_line '**::AVOID::**: ticket ('
expect_refusal "a word holding an unbalanced metacharacter" "must be letters"

new_project latin1-glossary
printf '## Language\n\n### Order\n\nA caf\xe9.\n\n**::AVOID::**: purchase\n' >"$PROJECT/GLOSSARY.md"
expect_clean_stop "a glossary that is not UTF-8" "cannot read"

new_project latin1-config
one_entry
printf 'StylesPath = st\n\n# caf\xe9\n[*.md]\nBasedOnStyles = Glossary\n' >"$PROJECT/.vale.ini"
expect_clean_stop "a config that is not UTF-8" "cannot read"
expect_no_file "that config gets no rule under its StylesPath" st

new_project config-is-directory
one_entry
mkdir "$PROJECT/.vale.ini"
expect_clean_stop "a directory named .vale.ini" "is not a file"

new_project config-malformed
one_entry
printf '= oops\n' >"$PROJECT/.vale.ini"
expect_clean_stop "a config configparser cannot read" "cannot read"

new_project config-indented
one_entry
printf 'StylesPath = st\n  MinAlertLevel = suggestion\n\n[*.md]\nBasedOnStyles = Glossary\n' >"$PROJECT/.vale.ini"
expect_exit "an indented key after StylesPath" 0
expect_file "an indented key stays out of the path" st/Glossary/Terms.yml

new_project config-backslash
one_entry
printf 'StylesPath = st\\\nmore\n\n[*.md]\nBasedOnStyles = Glossary\n' >"$PROJECT/.vale.ini"
expect_clean_stop "a StylesPath ending in a backslash" "backslash"

new_project config-bom
one_entry
printf '\xef\xbb\xbfStylesPath = st\n\n[*.md]\nBasedOnStyles = Glossary\n' >"$PROJECT/.vale.ini"
expect_exit "a config opening with a BOM" 0
expect_file "a BOM does not hide StylesPath" st/Glossary/Terms.yml

new_project config-duplicate
one_entry
printf 'StylesPath = first\nStylesPath = second\n\n[*.md]\nBasedOnStyles = Glossary\n' >"$PROJECT/.vale.ini"
expect_exit "a config naming StylesPath twice" 0
expect_file "the last StylesPath wins, as in Vale" second/Glossary/Terms.yml

new_project config-bare-key
one_entry
printf 'StylesPath = st\nBareKey\n\n[*.md]\nBasedOnStyles = Glossary\n' >"$PROJECT/.vale.ini"
expect_exit "a config holding a key with no value" 0
expect_file "that config's StylesPath is still read" st/Glossary/Terms.yml

for name in _vale.ini _vale; do
  new_project "config-$name"
  one_entry
  printf 'StylesPath = st\n\n[*.md]\nBasedOnStyles = Glossary\n' >"$PROJECT/$name"
  expect_exit "a config named $name" 0
  expect_file "$name is read as the config" st/Glossary/Terms.yml
  expect_no_file "$name gets no second config beside it" .vale.ini
done

new_project grandparent-config/one/two
one_entry
printf 'StylesPath = styles\n\n[*.md]\nBasedOnStyles = Glossary\n' >"$PROJECT/../../.vale.ini"
expect_exit "a config two directories up" 2
expect_no_file "a config two directories up gets no second config below it" .vale.ini

new_project root-config
mkdir "$PROJECT/docs"
PROJECT="$PROJECT/docs"
one_entry
printf 'StylesPath = styles\n\n[*.md]\nBasedOnStyles = Glossary\n' >"$PROJECT/../.vale.ini"
expect_clean_stop "a run from the docs directory, with the config at the root" "run this from $(dirname "$PROJECT")"
expect_no_file "that run gets no config in the docs directory" .vale.ini

new_project no-config-root/docs
one_entry
expect_clean_stop "a run from a docs directory with no config" "run this from the project's root"
expect_no_file "that run writes no config" .vale.ini

new_project repo-named-docs/docs
one_entry
mkdir "$PROJECT/.git"
expect_exit "a repository whose root is named docs" 0
expect_file "that repository gets its config" .vale.ini

new_project docs-with-config/docs
one_entry
printf 'StylesPath = st\n\n[*.md]\nBasedOnStyles = Glossary\n' >"$PROJECT/.vale.ini"
expect_exit "a docs directory holding its own config" 0
expect_file "that directory counts as the root" st/Glossary/Terms.yml

new_project "path with a space"
one_entry
printf '# Probe\n\nA purchase here.\n' >"$PROJECT/doc.md"
expect_exit "a project whose path holds a space" 0
printed_command="$(sed -n 's/^glossary-rule: check the project from here with: //p' "$PROJECT/stdout")"
# WHY: the printed line is meant to be pasted into a shell, so a shell is what has to read it, and the flags keep the owner's global Vale config out.
(cd "$PROJECT" && bash -c "${printed_command/vale /vale --no-global --output=line }" >"$PROJECT/alerts" 2>&1) || true
if grep -qF "doc.md:3:3:Glossary.Terms" "$PROJECT/alerts"; then pass "the printed command finds the drifted word"; else fail "the printed command: $printed_command: $(cat "$PROJECT/alerts")"; fi

new_project raised-alert-level
one_entry
printf '# Probe\n\nA purchase here.\n' >"$PROJECT/doc.md"
printf 'StylesPath = .vale/styles\nMinAlertLevel = error\n\n[*.md]\nBasedOnStyles = Glossary\n' >"$PROJECT/.vale.ini"
expect_exit "a config raising the alert level" 0
(cd "$PROJECT" && vale --no-global --output=line doc.md >"$PROJECT/alerts" 2>&1) || true
expect_no_alert "a raised alert level hides the rule" "Glossary.Terms"
printf 'StylesPath = .vale/styles\nMinAlertLevel = error\n\n[*.md]\nBasedOnStyles = Glossary\nGlossary.Terms = error\n' >"$PROJECT/.vale.ini"
(cd "$PROJECT" && vale --no-global --output=line doc.md >"$PROJECT/alerts" 2>&1) || true
expect_alert "the printed override shows it again" "doc.md:3:3:Glossary.Terms:Use 'Order' instead of 'purchase'."

if [ "$fails" -gt 0 ]; then
  echo "test-glossary-rule: $fails failure(s)"
  exit 1
fi
echo "test-glossary-rule: all passed"
