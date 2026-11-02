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

# Writes a glossary at the project's root holding the given JSON list of entries.
terms() {
  printf '{"project": "Shop", "summary": "A shop.", "terms": %s}\n' "$1" >"$PROJECT/GLOSSARY.json"
}

one_entry() {
  terms '[{"term": "Order", "definition": "A request to buy.", "avoid": ["purchase"]}]'
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
  if [ -e "$PROJECT/GLOSSARY.md" ]; then fail "$name: wrote a GLOSSARY.md"; else pass "$name: wrote no GLOSSARY.md"; fi
  if [ -e "$PROJECT/.vale.ini" ]; then fail "$name: wrote a config"; else pass "$name: wrote no config"; fi
}

expect_alert() {
  local name="$1" line="$2"
  if grep -qxF "$line" "$PROJECT/alerts"; then pass "$name"; else fail "$name: '$line' not in: $(cat "$PROJECT/alerts")"; fi
}

expect_no_alert() {
  local name="$1" pattern="$2"
  if grep -qiE "$pattern" "$PROJECT/alerts"; then fail "$name: $(grep -iE "$pattern" "$PROJECT/alerts")"; else pass "$name"; fi
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

expect_clean_stop() {
  local name="$1" reason="$2"
  expect_exit "$name" 2
  if grep -qF "$reason" "$PROJECT/stderr" && ! grep -qF "Traceback" "$PROJECT/stderr"; then pass "$name: says '$reason'"; else fail "$name: stderr: $(cat "$PROJECT/stderr")"; fi
  expect_no_file "$name: no rule is written" .vale/styles/Glossary/Terms.yml
  expect_no_file "$name: no GLOSSARY.md is written" GLOSSARY.md
}

new_project full
mkdir -p "$PROJECT/docs"
cat >"$PROJECT/docs/GLOSSARY.json" <<'EOF'
{
  "project": "Shop",
  "summary": "What a shop sells, and to whom.",
  "terms": [
    {
      "term": "Order",
      "definition": "A customer's request to buy something, never a purchase.",
      "avoid": ["purchase", "shopping basket"]
    },
    {
      "term": "Customer",
      "definition": "A person who places orders.",
      "avoid": ["client", "account"],
      "except": ["take into account"]
    },
    {
      "term": "Refund",
      "definition": "Money returned to a customer."
    }
  ],
  "flagged_ambiguities": ["\"account\" had been used for both Customer and User; these are distinct."]
}
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
MARKDOWN="$PROJECT/docs/GLOSSARY.md"

cat >"$WORK/wanted-markdown" <<'EOF'
<!-- Generated from GLOSSARY.json by the glossary-guru skill. Edit GLOSSARY.json, not this file. Regenerate from the project's root: python3 <skill-dir>/scripts/glossary-rule.py -->

# Shop

What a shop sells, and to whom.

## Language

### Order

A customer's request to buy something, never a purchase.

**AVOID**:

- purchase
- shopping basket

### Customer

A person who places orders.

**AVOID**:

- client
- account

**EXCEPT**:

- take into account

### Refund

Money returned to a customer.

## Flagged ambiguities

- "account" had been used for both Customer and User; these are distinct.
EOF
if cmp -s "$MARKDOWN" "$WORK/wanted-markdown"; then pass "GLOSSARY.md lands beside the source in the approved form"; else fail "GLOSSARY.md differs: $(diff "$WORK/wanted-markdown" "$MARKDOWN" || true)"; fi

# WHY: this one sets aside the exit code, since a warning leaves Vale at zero and the alerts themselves are the evidence.
(cd "$PROJECT" && vale --no-global --output=line . >"$PROJECT/alerts" 2>&1) || true

expect_alert "a drift word fires in any case, naming both words" "doc.md:3:3:Glossary.Terms:Use 'Order' instead of 'PURCHASE'."
expect_alert "a phrase in an avoid list fires across a line break" "doc.md:5:3:Glossary.Terms:Use 'Order' instead of 'shopping basket'."
expect_alert "a word an exception does not cover still fires" "doc.md:12:5:Glossary.Terms:Use 'Customer' instead of 'account'."
expect_alert "a code comment fires" "code.rb:1:7:Glossary.Terms:Use 'Customer' instead of 'client'."
expect_no_alert "an excepted phrase, a longer word and the terms stay quiet" "doc.md:(8|10|14|16):"
expect_no_alert "a method name and a string stay quiet" "code.rb:[2-9]:"
expect_no_alert "a Vale run reports nothing for the generated GLOSSARY.md or its source" "GLOSSARY\.(md|json):"

quiet_exit=0
(cd "$PROJECT" && vale --no-global --output=line . >/dev/null 2>&1) || quiet_exit=$?
if [ "$quiet_exit" = 0 ]; then pass "a warning leaves a Vale run at zero"; else fail "a warning made Vale exit $quiet_exit"; fi

sed 's/^BasedOnStyles = Glossary$/&\nGlossary.Terms = error/' "$PROJECT/.vale.ini" >"$PROJECT/error.ini"
loud_exit=0
(cd "$PROJECT" && vale --no-global --config=error.ini --output=line doc.md >/dev/null 2>&1) || loud_exit=$?
if [ "$loud_exit" = 1 ]; then pass "the .vale.ini override makes a drifted word fail the run"; else fail "the .vale.ini override made Vale exit $loud_exit, wanted 1"; fi
clean_exit=0
(cd "$PROJECT" && vale --no-global --config=error.ini --output=line docs/GLOSSARY.md >/dev/null 2>&1) || clean_exit=$?
if [ "$clean_exit" = 0 ]; then pass "the override leaves the generated GLOSSARY.md alone"; else fail "the override made the generated GLOSSARY.md exit $clean_exit"; fi

first_lines="$(head -n 2 "$RULE")"
if [[ "$first_lines" == *"Generated"* && "$first_lines" == *"python3 <skill-dir>/scripts/glossary-rule.py" ]]; then
  pass "the rule opens by saying it is generated, naming the command"
else
  fail "the rule's opening lines: $first_lines"
fi
first_line="$(head -n 1 "$MARKDOWN")"
if [[ "$first_line" == "<!-- Generated"*"python3 <skill-dir>/scripts/glossary-rule.py -->" ]]; then
  pass "GLOSSARY.md opens with a comment saying it is generated, naming the command"
else
  fail "GLOSSARY.md's opening line: $first_line"
fi

cp "$RULE" "$WORK/first-run"
cp "$MARKDOWN" "$WORK/first-markdown"
expect_exit "a second run" 0
if cmp -s "$RULE" "$WORK/first-run"; then pass "a second run leaves the rule byte-identical"; else fail "a second run changes the rule"; fi
if cmp -s "$MARKDOWN" "$WORK/first-markdown"; then pass "a second run leaves GLOSSARY.md byte-identical"; else fail "a second run changes GLOSSARY.md"; fi

printf 'A stray line.\n' >>"$MARKDOWN"
expect_exit "a generated GLOSSARY.md edited by hand" 0
if cmp -s "$MARKDOWN" "$WORK/first-markdown"; then pass "the next run replaces the hand edit"; else fail "the next run kept the hand edit"; fi

new_project no-flagged
terms '[{"term": "Order", "definition": "A request to buy."}]'
expect_exit "a glossary with no flagged ambiguities and no lists" 0
if grep -qE 'Flagged|AVOID|EXCEPT' "$PROJECT/GLOSSARY.md"; then fail "an absent section or list still renders: $(cat "$PROJECT/GLOSSARY.md")"; else pass "an absent section or list renders nothing"; fi

new_project empty-lists
printf '{"project": "Shop", "summary": "A shop.", "terms": [{"term": "Order", "definition": "A request to buy.", "avoid": [], "except": []}], "flagged_ambiguities": []}\n' >"$PROJECT/GLOSSARY.json"
expect_exit "a glossary with empty lists" 0
if grep -qE 'Flagged|AVOID|EXCEPT' "$PROJECT/GLOSSARY.md"; then fail "an empty list still renders: $(cat "$PROJECT/GLOSSARY.md")"; else pass "an empty list renders nothing"; fi

new_project source-bom
printf '\xef\xbb\xbf{"project": "Shop", "summary": "A shop.", "terms": [{"term": "Order", "definition": "A request to buy."}]}\n' >"$PROJECT/GLOSSARY.json"
expect_exit "a source opening with a BOM" 0

new_project multi-word
terms '[
  {"term": "Shopping Cart", "definition": "What a customer is about to buy.", "avoid": ["cart"]},
  {"term": "Order Line", "definition": "One thing on an order."},
  {"term": "Order", "definition": "A request to buy.", "avoid": ["line"]}
]'
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
terms '[{"term": "Shopping Cart", "definition": "What a customer is about to buy.", "avoid": ["cart"], "except": ["shopping cart"]}]'
expect_exit "a term and an excepted phrase differing only in case" 0
cp "$PROJECT/.vale/styles/Glossary/Terms.yml" "$WORK/case-pair-rule"
cp "$PROJECT/GLOSSARY.md" "$WORK/case-pair-markdown"
pair_differs=no
for seed in 1 2 3 4 5 6 7 8; do
  (cd "$PROJECT" && PYTHONHASHSEED="$seed" python3 "$SCRIPT" >/dev/null)
  cmp -s "$PROJECT/.vale/styles/Glossary/Terms.yml" "$WORK/case-pair-rule" || pair_differs=yes
  cmp -s "$PROJECT/GLOSSARY.md" "$WORK/case-pair-markdown" || pair_differs=yes
done
if [ "$pair_differs" = no ]; then pass "a case-only pair regenerates byte-identically under any hash seed"; else fail "a case-only pair changes with the hash seed"; fi
pair_count="$(grep -ci '(?i)shopping cart' "$WORK/case-pair-rule" || true)"
if [ "$pair_count" = 1 ]; then pass "a case-only pair is written once"; else fail "a case-only pair is written $pair_count times"; fi

new_project sharp-s
terms '[{"term": "Bestellung", "definition": "Was ein Kunde kauft.", "avoid": ["strasse"], "except": ["Große Strasse", "grosse strasse"]}]'
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

new_project no-config
one_entry
printf '# Probe\n\nA purchase here.\n' >"$PROJECT/doc.md"
expect_exit "a project with no Vale config" 0
expect_stdout "with no config the script says how to run the check" "glossary-rule: check the project from here with: vale $(cd "$PROJECT" && pwd -P)"
expect_file "no config: the rule lands under .vale/styles" .vale/styles/Glossary/Terms.yml
expect_file "no config: GLOSSARY.md lands beside a source at the root" GLOSSARY.md
expect_file "no config: the script writes .vale.ini" .vale.ini
if cmp -s "$PROJECT/.vale.ini" "$TEMPLATE"; then pass "the written config is a copy of the template"; else fail "the written config differs from the template"; fi
(cd "$PROJECT" && vale --no-global --output=line . >"$PROJECT/alerts" 2>&1) || true
expect_alert "the written config turns the rule on" "doc.md:3:3:Glossary.Terms:Use 'Order' instead of 'purchase'."
expect_no_alert "the written config keeps the rule off the generated GLOSSARY.md" "GLOSSARY\.(md|json):"
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
expect_no_alert "with the printed lines the generated GLOSSARY.md stays quiet" "GLOSSARY\.(md|json):"

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
expect_no_file "that config gets no GLOSSARY.md" GLOSSARY.md

new_project quoted-word
terms "[{\"term\": \"Order\", \"definition\": \"A request to buy.\", \"avoid\": [\"'purchase'\"]}]"
expect_refusal "a single-quoted word" "a straight apostrophe after a letter"

new_project quote-at-the-end
terms "[{\"term\": \"Order\", \"definition\": \"A request to buy.\", \"avoid\": [\"purchase'\"]}]"
expect_refusal "a quote mark closing a word" "more of the phrase after it"

new_project quoted-part
terms "[{\"term\": \"Order\", \"definition\": \"A request to buy.\", \"avoid\": [\"big 'order'\"]}]"
expect_refusal "a quoted word inside a phrase" "a straight apostrophe after a letter"

new_project possessive-word
terms "[{\"term\": \"Order\", \"definition\": \"A request to buy.\", \"avoid\": [\"customer's purchase\"]}]"
expect_exit "an apostrophe inside a word" 0

new_project possessive-phrase
terms "[
  {\"term\": \"Customer\", \"definition\": \"A person who buys.\", \"avoid\": [\"ledger\", \"customers' purchase\"], \"except\": [\"customers' ledger\"]},
  {\"term\": \"Customers' Book\", \"definition\": \"What a shop keeps on them.\", \"avoid\": [\"book\"]}
]"
printf "# Probe\n\nThe customers' purchase here.\n\nThe customers' ledger here.\n\nThe customers' book here.\n" >"$PROJECT/doc.md"
expect_exit "a plural possessive inside a phrase" 0
(cd "$PROJECT" && vale --no-global --output=line doc.md >"$PROJECT/alerts" 2>&1) || true
expect_alert "a possessive phrase in an avoid list fires" "doc.md:3:5:Glossary.Terms:Use 'Customer' instead of 'customers' purchase'."
expect_no_alert "a possessive phrase in an except list and in a term stays quiet" "doc.md:(5|7):"

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
expect_no_file "two configs: no GLOSSARY.md is written" GLOSSARY.md

new_project refused-no-config
terms '[
  {"term": "Order", "definition": "A request to buy.", "avoid": ["purchase"]},
  {"term": "Refund", "definition": "Money returned.", "avoid": ["purchase"]}
]'
expect_refusal "a refused glossary with no config" "no single replacement"

new_project an-argument
one_entry
arg_exit=0
(cd "$PROJECT" && python3 "$SCRIPT" somewhere >/dev/null 2>&1) || arg_exit=$?
if [ "$arg_exit" = 2 ]; then pass "an argument exits 2"; else fail "an argument exits $arg_exit, wanted 2"; fi
expect_no_file "an argument writes nothing" somewhere
expect_no_file "an argument writes no GLOSSARY.md" GLOSSARY.md

new_project term-metacharacter
terms '[{"term": "Shopping Cart (legacy)", "definition": "What a customer was about to buy.", "avoid": ["cart"]}]'
expect_refusal "a term holding a drift word and a metacharacter" "must be letters"

new_project term-no-space
terms '[
  {"term": "Pre-Order", "definition": "An order placed before release."},
  {"term": "Purchase", "definition": "A request to buy.", "avoid": ["order"]}
]'
expect_refusal "a term with no space holding a drift word" "holds no space"

new_project except-no-space
terms '[{"term": "Purchase", "definition": "A request to buy.", "avoid": ["order"], "except": ["pre-order"]}]'
expect_refusal "an excepted phrase with no space" "holds no space"

new_project root
one_entry
expect_exit "a glossary at the root" 0
if grep -q '"purchase": "Order"' "$PROJECT/.vale/styles/Glossary/Terms.yml"; then pass "a glossary at the root is read"; else fail "a glossary at the root is not read"; fi

new_project both
mkdir -p "$PROJECT/docs"
one_entry
cp "$PROJECT/GLOSSARY.json" "$PROJECT/docs/GLOSSARY.json"
expect_exit "a glossary at both paths" 2
expect_no_file "a glossary at both paths writes no GLOSSARY.md" GLOSSARY.md

new_project none
expect_exit "no glossary" 2

new_project markdown-only
printf '# Shop\n\n## Language\n\n### Order\n\nA request to buy.\n' >"$PROJECT/GLOSSARY.md"
expect_exit "a GLOSSARY.md with no GLOSSARY.json" 2
if grep -qF "GLOSSARY.json" "$PROJECT/stderr"; then pass "that stop names the file it wants"; else fail "that stop's stderr: $(cat "$PROJECT/stderr")"; fi
expect_no_file "that stop writes no rule" .vale/styles/Glossary/Terms.yml

new_project option
one_entry
option_exit=0
(cd "$PROJECT" && python3 "$SCRIPT" --help >/dev/null 2>&1) || option_exit=$?
if [ "$option_exit" = 2 ]; then pass "an option exits 2"; else fail "an option exits $option_exit, wanted 2"; fi
if [ -e "$PROJECT/--help" ]; then fail "an option was taken as a styles path"; else pass "an option writes nothing"; fi

new_project quiet
terms '[{"term": "Order", "definition": "A request to buy."}]'
expect_exit "a glossary naming no drift word" 0
if grep -qx 'swap: {}' "$PROJECT/.vale/styles/Glossary/Terms.yml" 2>/dev/null; then pass "a glossary naming no drift word writes a rule that swaps nothing"; else fail "a glossary naming no drift word wrote no empty rule"; fi

new_project stale
one_entry
expect_exit "a glossary before its last drift word goes" 0
terms '[{"term": "Order", "definition": "A request to buy."}]'
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
terms '[
  {"term": "Order", "definition": "A request to buy.", "avoid": ["purchase"]},
  {"term": "Sale", "definition": "A completed purchase.", "avoid": ["Purchase"]}
]'
expect_refusal "a word on two entries" "no single replacement"

new_project a-term
terms '[
  {"term": "Member", "definition": "A membership in one group.", "avoid": ["user"]},
  {"term": "User", "definition": "A person who signed up."}
]'
expect_refusal "a word that is another entry's term" "is also an entry's term"

new_project metacharacter
terms '[{"term": "Issue", "definition": "A tracked unit of work.", "avoid": ["ticket (when quoting)"]}]'
expect_refusal "a word holding a metacharacter" "must be letters"

new_project empty-word
terms '[{"term": "Order", "definition": "A request to buy.", "avoid": ["purchase", ""]}]'
expect_refusal "an empty word" "must be letters"
if grep -qF "holds a drift word" "$PROJECT/stderr"; then fail "a refused word reached a later check: $(cat "$PROJECT/stderr")"; else pass "a refused word reaches no later check"; fi

count=0
for word in ' purchase' 'purchase ' ' '; do
  count=$((count + 1))
  new_project spaced-word-$count
  terms "[{\"term\": \"Order\", \"definition\": \"A request to buy.\", \"avoid\": [\"$word\"]}]"
  expect_refusal "the word '$word'" "no space at either end"
done

new_project spaced-term
terms '[{"term": " Order", "definition": "A request to buy."}]'
expect_refusal "a term with a space at one end" "no space at either end"

new_project issue-example
printf '{"project": "Shop", "summary": "A shop.", "terms": [{"term": "Order", "definition": "A request to buy.", "avod": ["purchase"]}]}\n' >"$PROJECT/GLOSSARY.json"
expect_refusal "a misspelled key in an entry" "Order: the key 'avod' is not in the format"

new_project top-level-key
printf '{"project": "Shop", "summary": "A shop.", "term": [], "terms": [{"term": "Order", "definition": "A request to buy."}]}\n' >"$PROJECT/GLOSSARY.json"
expect_refusal "a misspelled key at the top level" "top level: the key 'term' is not in the format"

new_project repeated-key
printf '{"project": "Shop", "summary": "A shop.", "terms": [{"term": "Order", "definition": "A request to buy.", "avoid": ["purchase"], "avoid": ["sale"]}]}\n' >"$PROJECT/GLOSSARY.json"
expect_refusal "a key appearing twice in an entry" "the key 'avoid' appears twice"

new_project invalid-json
printf '{"project": "Shop",}\n' >"$PROJECT/GLOSSARY.json"
expect_refusal "invalid JSON" "not valid JSON: "

count=0
for top in '[]' '"Shop"' 'null'; do
  count=$((count + 1))
  new_project not-an-object-$count
  printf '%s\n' "$top" >"$PROJECT/GLOSSARY.json"
  expect_refusal "a glossary that is '$top'" "top level: must be an object"
done

new_project no-project
printf '{"summary": "A shop.", "terms": [{"term": "Order", "definition": "A request to buy."}]}\n' >"$PROJECT/GLOSSARY.json"
expect_refusal "a missing project" "top level: the key 'project' is missing"

new_project no-summary
printf '{"project": "Shop", "terms": [{"term": "Order", "definition": "A request to buy."}]}\n' >"$PROJECT/GLOSSARY.json"
expect_refusal "a missing summary" "top level: the key 'summary' is missing"

new_project no-terms
printf '{"project": "Shop", "summary": "A shop."}\n' >"$PROJECT/GLOSSARY.json"
expect_refusal "missing terms" "top level: the key 'terms' is missing"

new_project empty-terms
terms '[]'
expect_refusal "an empty list of terms" "'terms' holds no entry"

new_project string-terms
terms '"Order"'
expect_refusal "a string where the terms belong" "top level: 'terms' must be a list"

new_project entry-not-object
terms '["Order"]'
expect_refusal "an entry that is a string" "entry 1: must be an object"

new_project no-term
terms '[{"term": "Order", "definition": "A request to buy."}, {"definition": "Money returned."}]'
expect_refusal "a missing term" "entry 2: the key 'term' is missing"

new_project no-definition
terms '[{"term": "Order"}]'
expect_refusal "a missing definition" "Order: the key 'definition' is missing"

new_project term-not-string
terms '[{"term": 5, "definition": "A request to buy."}]'
expect_refusal "a term that is a number" "entry 1: the term must be"

new_project empty-definition
terms '[{"term": "Order", "definition": "  "}]'
expect_refusal "an empty definition" "Order: the definition must be one line of text"

new_project definition-lines
terms '[{"term": "Order", "definition": "A request.\n### Forged"}]'
expect_refusal "a definition holding a line break" "Order: the definition must be one line of text"

new_project project-lines
printf '{"project": "Shop\\n## Forged", "summary": "A shop.", "terms": [{"term": "Order", "definition": "A request to buy."}]}\n' >"$PROJECT/GLOSSARY.json"
expect_refusal "a project holding a line break" "top level: 'project' must be one line of text"

new_project summary-not-string
printf '{"project": "Shop", "summary": ["A shop."], "terms": [{"term": "Order", "definition": "A request to buy."}]}\n' >"$PROJECT/GLOSSARY.json"
expect_refusal "a list where the summary belongs" "top level: 'summary' must be one line of text"

new_project string-avoid
terms '[{"term": "Order", "definition": "A request to buy.", "avoid": "purchase"}]'
expect_refusal "a string where the avoid list belongs" "Order: 'avoid' must be a list"

new_project string-except
terms '[{"term": "Order", "definition": "A request to buy.", "avoid": ["account"], "except": "take into account"}]'
expect_refusal "a string where the except list belongs" "Order: 'except' must be a list"

new_project number-in-avoid
terms '[{"term": "Order", "definition": "A request to buy.", "avoid": [5]}]'
expect_refusal "a number in an avoid list" "Order: 5 under 'avoid' must be"

new_project string-flagged
printf '{"project": "Shop", "summary": "A shop.", "terms": [{"term": "Order", "definition": "A request to buy."}], "flagged_ambiguities": "one"}\n' >"$PROJECT/GLOSSARY.json"
expect_refusal "a string where the flagged list belongs" "top level: 'flagged_ambiguities' must be a list"

new_project flagged-lines
printf '{"project": "Shop", "summary": "A shop.", "terms": [{"term": "Order", "definition": "A request to buy."}], "flagged_ambiguities": ["one\\ntwo"]}\n' >"$PROJECT/GLOSSARY.json"
expect_refusal "a flagged ambiguity holding a line break" "under 'flagged_ambiguities' must be one line of text"

new_project hand-written-rule
one_entry
mkdir -p "$PROJECT/.vale/styles/Glossary"
printf 'extends: substitution\nmessage: "hand-written"\nswap:\n  fee: Charge\n' >"$PROJECT/.vale/styles/Glossary/Terms.yml"
cp "$PROJECT/.vale/styles/Glossary/Terms.yml" "$WORK/hand-written"
expect_exit "a rule file this script did not write" 2
if grep -qF "did not write" "$PROJECT/stderr"; then pass "that refusal says why"; else fail "that refusal's stderr: $(cat "$PROJECT/stderr")"; fi
if cmp -s "$PROJECT/.vale/styles/Glossary/Terms.yml" "$WORK/hand-written"; then pass "a hand-written rule stays as it was"; else fail "a hand-written rule was replaced"; fi
expect_no_file "that refusal writes no config" .vale.ini
expect_no_file "that refusal writes no GLOSSARY.md" GLOSSARY.md

new_project hand-written-markdown
one_entry
printf '# Shop\n\nWritten by a person.\n' >"$PROJECT/GLOSSARY.md"
cp "$PROJECT/GLOSSARY.md" "$WORK/kept-markdown"
expect_exit "a GLOSSARY.md this script did not write" 2
if grep -qF "did not write GLOSSARY.md" "$PROJECT/stderr"; then pass "that refusal names the file"; else fail "that refusal's stderr: $(cat "$PROJECT/stderr")"; fi
if cmp -s "$PROJECT/GLOSSARY.md" "$WORK/kept-markdown"; then pass "a hand-written GLOSSARY.md stays as it was"; else fail "a hand-written GLOSSARY.md was replaced"; fi
expect_no_file "that refusal writes no rule" .vale/styles/Glossary/Terms.yml
expect_no_file "that refusal writes no config" .vale.ini

new_project hand-written-docs-markdown
mkdir -p "$PROJECT/docs"
printf '{"project": "Shop", "summary": "A shop.", "terms": [{"term": "Order", "definition": "A request to buy."}]}\n' >"$PROJECT/docs/GLOSSARY.json"
printf '# Shop\n' >"$PROJECT/docs/GLOSSARY.md"
expect_exit "a hand-written GLOSSARY.md beside a source in docs" 2
if [ "$(cat "$PROJECT/docs/GLOSSARY.md")" = "# Shop" ]; then pass "that GLOSSARY.md stays as it was"; else fail "that GLOSSARY.md was replaced"; fi

count=0
for term in 'Order (legacy)' '\"Order\"' "'Order'" 'C#' 'Customer’s Book'; do
  count=$((count + 1))
  new_project plain-term-$count
  terms "[{\"term\": \"$term\", \"definition\": \"A request to buy.\"}]"
  expect_refusal "the term '$term'" "must be letters"
done

new_project apostrophe-term
terms "[{\"term\": \"Order's Line\", \"definition\": \"One thing on an order.\"}]"
expect_exit "a term holding an apostrophe" 0

new_project quoted-definition
terms '[{"term": "Order", "definition": "A \"request\" to buy, written `like this`."}]'
expect_exit "a definition holding quotes and a code span" 0

new_project sharp-s-term
terms '[{"term": "Straße", "definition": "Ein Weg.", "avoid": ["Strasse"]}]'
expect_exit "a drift word equal to a term only under full case folding" 0

new_project sharp-s-pair
terms '[
  {"term": "Weg", "definition": "Ein Weg.", "avoid": ["Straße"]},
  {"term": "Pfad", "definition": "Ein Pfad.", "avoid": ["Strasse"]}
]'
expect_exit "two drift words equal only under full case folding" 0

new_project curly-apostrophe
terms '[{"term": "Order", "definition": "A request to buy.", "avoid": ["customer’s purchase"]}]'
expect_refusal "a curly apostrophe" "a straight apostrophe"

new_project except-typo
terms '[{"term": "Customer", "definition": "A person who buys.", "avoid": ["account"], "except": ["on acount of"]}]'
expect_refusal "an excepted phrase holding no drift word" "holds no word from any 'avoid' list"

new_project unbalanced-word
terms '[{"term": "Order", "definition": "A request to buy.", "avoid": ["ticket ("]}]'
expect_refusal "a word holding an unbalanced metacharacter" "must be letters"

new_project latin1-glossary
printf '{"project": "Caf\xe9", "summary": "A shop.", "terms": [{"term": "Order", "definition": "A request to buy."}]}\n' >"$PROJECT/GLOSSARY.json"
expect_clean_stop "a glossary that is not UTF-8" "cannot read"

new_project latin1-config
one_entry
printf 'StylesPath = st\n\n# caf\xe9\n[*.md]\nBasedOnStyles = Glossary\n' >"$PROJECT/.vale.ini"
expect_clean_stop "a config that is not UTF-8" "cannot read"
expect_no_file "that config gets no rule under its StylesPath" st

new_project latin1-markdown
one_entry
printf 'A caf\xe9.\n' >"$PROJECT/GLOSSARY.md"
expect_exit "a GLOSSARY.md that is not UTF-8" 2
if grep -qF "cannot read" "$PROJECT/stderr" && ! grep -qF "Traceback" "$PROJECT/stderr"; then pass "that GLOSSARY.md gets a reason, not a traceback"; else fail "that GLOSSARY.md's stderr: $(cat "$PROJECT/stderr")"; fi

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
