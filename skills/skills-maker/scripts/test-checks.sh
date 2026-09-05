#!/usr/bin/env bash
# Regression bench for the description checks: one fixture per known trap,
# generated into a temp directory (never shipped as real SKILL.md files,
# which some agents would discover recursively as broken skills). Every trap
# must be caught and every good form must pass; run this after any edit to
# the check scripts. A check that has never been seen to fail is not evidence.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
cd "$tmp"

mk() { mkdir -p "$1"; printf -- '---\n%b\n---\nbody\n' "$2" > "$1/SKILL.md"; }
mk good-block   'name: good-block\ndescription: |\n  Use for PR #N review: safe & sound'
mk good-quoted  'name: good-quoted\ndescription: "Plain quoted, no tricks"'
mk good-curly   'name: good-curly\ndescription: |\n  Use when reviewing the repository\xe2\x80\x99s own skills.'
mk t-comment    'name: t-comment\ndescription: review PR #N and more'
mk t-anchor     'name: t-anchor\ndescription: &draft Use when drafting'
mk t-curly      'name: t-curly\ndescription: \xe2\x80\x9cUse for PR #N\xe2\x80\x9d'
mk t-dupe       'name: t-dupe\ndescription: first\ndescription: second'
mk t-colon      'name: t-colon\ndescription: Use when: reviewing'
mk t-tailcolon  'name: t-tailcolon\ndescription: Use when reviewing:'
mk t-backslash  'name: t-backslash\ndescription: "matches \\d+ digits"'
mk t-innerdq    'name: t-innerdq\ndescription: "say "hi" now"'
mk t-apostrophe "name: t-apostrophe\ndescription: 'Don't use'"
mk t-bool       'name: t-bool\ndescription: yes'
mk t-missing    'name: t-missing'

fail=0
out="$(node "$here/check-descriptions.js")"
expect() {
  case "$(printf '%s\n' "$out" | grep "^$1 ")" in
    *"$2"*) printf 'PASS  sweep %-14s %s\n' "$1" "$2" ;;
    *) printf 'FAIL  sweep %-14s wanted "%s"\n' "$1" "$2"; fail=1 ;;
  esac
}
expect good-block   'ok'
expect good-quoted  'ok'
expect good-curly   'ok'
expect t-comment    'TRUNCATED'
expect t-anchor     'leading &'
expect t-curly      'curly quotes'
expect t-dupe       'duplicate description'
expect t-colon      'colon inside'
expect t-tailcolon  'colon inside'
expect t-backslash  'risky backslash'
expect t-innerdq    'inner double quote'
expect t-apostrophe 'odd apostrophe'
expect t-bool       'boolean'
expect t-missing    'no description'

if command -v ruby >/dev/null; then
  dout="$(ruby "$here/check-differential.rb")"
  dexpect() {
    case "$(printf '%s\n' "$dout" | grep "^$1/")" in
      *"$2"*) printf 'PASS  diff  %-14s %s\n' "$1" "$2" ;;
      *) printf 'FAIL  diff  %-14s wanted "%s"\n' "$1" "$2"; fail=1 ;;
    esac
  }
  dexpect t-comment    'SILENTLY MUTATED'
  dexpect t-anchor     'SILENTLY MUTATED'
  dexpect t-curly      'SILENTLY MUTATED'
  dexpect t-dupe       'SILENTLY MUTATED'
  dexpect t-bool       'not a string'
  dexpect t-colon      'PARSE ERROR'
  dexpect t-tailcolon  'PARSE ERROR'
  dexpect t-innerdq    'PARSE ERROR'
  dexpect t-apostrophe 'PARSE ERROR'
  dexpect t-backslash  'PARSE ERROR'
  for g in good-block good-quoted good-curly; do
    if printf '%s\n' "$dout" | grep -q "^$g/"; then
      printf 'FAIL  diff  %-14s flagged a good fixture\n' "$g"; fail=1
    else
      printf 'PASS  diff  %-14s clean\n' "$g"
    fi
  done
else
  echo 'SKIP  differential: no ruby on this machine'
fi

# Targeting: a single skill directory must be checked, and a target with no
# skill under it must fail loudly rather than pass by printing nothing.
mkdir -p "$tmp/empty"
target() {
  out2="$(node "$here/check-descriptions.js" "$2")"; code=$?
  case "$out2$code" in
    *"$3"*) printf 'PASS  sweep %-14s %s\n' "$1" "$3" ;;
    *) printf 'FAIL  sweep %-14s wanted "%s", got "%s" exit %s\n' "$1" "$3" "$out2" "$code"; fail=1 ;;
  esac
  if command -v ruby >/dev/null; then
    out3="$(ruby "$here/check-differential.rb" "$2")"; code=$?
    case "$out3$code" in
      *"$4"*) printf 'PASS  diff  %-14s %s\n' "$1" "$4" ;;
      *) printf 'FAIL  diff  %-14s wanted "%s", got "%s" exit %s\n' "$1" "$4" "$out3" "$code"; fail=1 ;;
    esac
  fi
}
target single-skill "$tmp/good-block" '1 skill(s) checked, 0 with defects0' '1 skill(s) checked, 0 with defects0'
target single-bad   "$tmp/t-comment"  '1 skill(s) checked, 1 with defects1' 'SILENTLY MUTATED'
target empty-target "$tmp/empty"      'nothing was checked1'                'nothing was checked1'

# Package roots. A plugin's skills sit at <root>/skills/ and its manifest,
# agents, hooks and README belong to no skill, so a root is neither of the two
# shapes the checks accepted before. The fixtures live under a dot-directory so
# the whole-tree sweep above keeps the target set it was written for.
mk .fx/pkg/skills/alpha 'name: alpha\ndescription: |\n  Alpha, under a package root.'
mk .fx/pkg/skills/beta  'name: beta\ndescription: |\n  Beta, under the same root.'
mk .fx/pkg/skills/alpha/references 'name: example\ndescription: |\n  An example SKILL.md quoted inside a skill.'
mk .fx/pkg/.hidden 'name: hidden\ndescription: |\n  A skill inside a dot-directory, which the walk must not descend into.'
mkdir -p .fx/pkg/agents .fx/pkg/hooks .fx/pkg/.claude-plugin
echo body > .fx/pkg/agents/reviewer.md
echo body > .fx/pkg/hooks/hook.py
echo '{}' > .fx/pkg/.claude-plugin/plugin.json
echo body > .fx/pkg/README.md

# Two package roots side by side: the same skill name under each, which is why
# a skill is reported by its path relative to the target rather than its name.
mk .fx/many/one/skills/review 'name: review\ndescription: |\n  One plugin review skill.'
mk .fx/many/two/skills/review 'name: review\ndescription: |\n  Another plugin review skill.'

# A directory of symlinks into the canonical tree, which is what an agent's own
# skills directory is. A walk that does not follow them finds nothing here.
mkdir -p .fx/linked
ln -s ../pkg/skills/alpha .fx/linked/alpha
ln -s ../../good-block .fx/linked/good-block

shape() {
  sout="$(node "$here/check-descriptions.js" "$2")"; scode=$?
  case "$sout$scode" in
    *"$3"*) printf 'PASS  sweep %-14s %s\n' "$1" "$3" ;;
    *) printf 'FAIL  sweep %-14s wanted "%s", got "%s" exit %s\n' "$1" "$3" "$sout" "$scode"; fail=1 ;;
  esac
  if command -v ruby >/dev/null; then
    rout="$(ruby "$here/check-differential.rb" "$2")"; rcode=$?
    case "$rout$rcode" in
      *"$4"*) printf 'PASS  diff  %-14s %s\n' "$1" "$4" ;;
      *) printf 'FAIL  diff  %-14s wanted "%s", got "%s" exit %s\n' "$1" "$4" "$rout" "$rcode"; fail=1 ;;
    esac
  fi
}

# A skill's own directory is never descended into, so the example SKILL.md under
# alpha's references/ is part of alpha rather than a third skill; and the walk
# skips dot-directories, so .hidden/ is not a fourth. Remove either rule and the
# count below is wrong.
shape package-root  "$tmp/.fx/pkg"    '2 skill(s) checked, 0 with defects0' '2 skill(s) checked, 0 with defects0'
shape nested-roots  "$tmp/.fx/many"   '2 skill(s) checked, 0 with defects0' '2 skill(s) checked, 0 with defects0'
shape symlink-dir   "$tmp/.fx/linked" '2 skill(s) checked, 0 with defects0' '2 skill(s) checked, 0 with defects0'

# The name a package root reports is the path relative to the target: two
# plugins can each ship a skill called review, and bare names cannot tell them
# apart.
names="$(node "$here/check-descriptions.js" "$tmp/.fx/many")"
for want in one/skills/review two/skills/review; do
  case "$names" in
    *"$want"*) printf 'PASS  sweep %-14s %s\n' relative-name "$want" ;;
    *) printf 'FAIL  sweep %-14s wanted "%s", got "%s"\n' relative-name "$want" "$names"; fail=1 ;;
  esac
done

# The name check. Its cases are the ones shell written as prose gets wrong: a
# missing name, a mismatch, a name whose directory carries glob metacharacters,
# an empty target's exit code.
mk .fx/names/good      'name: good\ndescription: |\n  x'
mk .fx/names/mismatch  'name: something-else\ndescription: |\n  x'
mk '.fx/names/my [1] skill' 'name: wrong\ndescription: |\n  x'
mkdir -p '.fx/names/no-name'; printf -- '---\ndescription: |\n  x\n---\nbody\n' > '.fx/names/no-name/SKILL.md'
mkdir -p 'my 1 skill'   # the decoy the old loop's glob expanded onto

names_out="$(cd "$tmp" && node "$here/check-names.js" "$tmp/.fx/names")"; names_code=$?
nexpect() {
  case "$(printf '%s\n' "$names_out" | grep -- "$1")" in
    *"$2"*) printf 'PASS  names %-16s %s\n' "$1" "$2" ;;
    *) printf 'FAIL  names %-16s wanted "%s", got "%s"\n' "$1" "$2" "$names_out"; fail=1 ;;
  esac
}
nexpect 'mismatch'      'name is "something-else", directory is "mismatch"'
nexpect 'no-name'       'no name'
nexpect '4 skill(s)'    '4 skill(s) checked, 3 with defects'
case "$(printf '%s\n' "$names_out" | grep -c '^good ')" in
  0) printf 'PASS  names %-16s %s\n' good 'a matching name is silent' ;;
  *) printf 'FAIL  names %-16s reported a good fixture\n' good; fail=1 ;;
esac
# A directory whose name carries glob metacharacters is reported as itself. The
# fixture is deliberately misnamed so that it prints at all: an assertion on a
# well-named one could never fail, whatever the code did. The shell loop this
# replaced expanded the name onto the decoy above and never read the real one.
case "$(printf '%s\n' "$names_out" | grep 'my \[1\] skill')" in
  *'directory is "my [1] skill"') printf 'PASS  names %-16s %s\n' glob-name 'reported as itself, not glob-expanded' ;;
  *) printf 'FAIL  names %-16s got "%s"\n' glob-name "$names_out"; fail=1 ;;
esac
[ "$names_code" -eq 1 ] && printf 'PASS  names %-16s %s\n' exit-code 'non-zero on defects' \
  || { printf 'FAIL  names %-16s wanted exit 1, got %s\n' exit-code "$names_code"; fail=1; }

nempty="$(node "$here/check-names.js" "$tmp/empty")"; nempty_code=$?
case "$nempty$nempty_code" in
  *'nothing was checked1') printf 'PASS  names %-16s %s\n' empty-target 'nothing was checked, exit 1' ;;
  *) printf 'FAIL  names %-16s got "%s" exit %s\n' empty-target "$nempty" "$nempty_code"; fail=1 ;;
esac

# The argument shapes the description check is benched against apply here too,
# since both read the same walk: a package root is the shape the whole widening
# was for, and a name check that never saw one proves nothing about it.
npkg="$(node "$here/check-names.js" "$tmp/.fx/pkg")"; npkg_code=$?
case "$npkg$npkg_code" in
  *'2 skill(s) checked, 0 with defects0') printf 'PASS  names %-16s %s\n' package-root 'the skills under a package root' ;;
  *) printf 'FAIL  names %-16s got "%s" exit %s\n' package-root "$npkg" "$npkg_code"; fail=1 ;;
esac

# A quoted name and a name carrying a trailing comment both parse to the bare
# word, so neither is a mismatch.
mk .fx/scalars/quoted   'name: "quoted"\ndescription: |\n  x'
mk .fx/scalars/commented 'name: commented # note\ndescription: |\n  x'
mk .fx/scalars/twospace  'name: twospace  # two spaces before the comment\ndescription: |\n  x'
mk .fx/scalars/quotecom  'name: "quotecom" # a quoted value ends at its own quote\ndescription: |\n  x'
nscal="$(node "$here/check-names.js" "$tmp/.fx/scalars")"; nscal_code=$?
case "$nscal$nscal_code" in
  *'4 skill(s) checked, 0 with defects0') printf 'PASS  names %-16s %s\n' yaml-scalars 'quoted and commented names parse first' ;;
  *) printf 'FAIL  names %-16s got "%s" exit %s\n' yaml-scalars "$nscal" "$nscal_code"; fail=1 ;;
esac

nself="$(node "$here/check-names.js" "$tmp/good-block")"
case "$nself" in
  *'1 skill(s) checked, 0 with defects') printf 'PASS  names %-16s %s\n' single-skill 'the root-is-skill target checks itself' ;;
  *) printf 'FAIL  names %-16s got "%s"\n' single-skill "$nself"; fail=1 ;;
esac


# The continuation check. Every fixture is a shape the rule has to decide, and
# each one is here because a pattern written as prose got it wrong: the indent
# width, the leading character, a fenced body, a frontmatter block scalar, and a
# marker running straight on from the paragraph above it.
cdoc() { mkdir -p ".fx/cont/$1"; printf -- '---\nname: %s\ndescription: |\n  x\n---\n%b\n' "$1" "$2" > ".fx/cont/$1/SKILL.md"; }

cdoc c-one      '- **lead.** first line\n\n  the one continuation, which is the reason\n'
cdoc c-two      '- **lead.** first line\n\n  the reason\n\n  a second paragraph, which is a second claim\n'
cdoc c-bold     '- **lead.** first line\n\n  **a bolded continuation.** which is a heading wearing an indent\n'
cdoc c-fence0   'prose\n\n```css\n  .a { color: red }\n  .b { color: blue }\n```\n\nmore prose\n'
cdoc c-fencein  '- **lead.** first line\n\n  ```bash\n  echo hi\n  ```\n\n  the one continuation\n'
cdoc c-wide     '10. **ten.** a two-digit ordinal, so the content column is four\n\n    its one continuation\n\n   a three-space block, below that column and so outside the item\n'
cdoc c-tick     '- **lead.** first line\n\n  `COMMENT`, not `REQUEST_CHANGES`\n\n  `another` one opening with a backtick\n'
cdoc c-runon    '3. **three.** its lead\n\n   a continuation\n4. **four.** the marker runs straight on from the paragraph above\n\n   its reason\n\n   **and a bolded second.** which is the defect\n'
cdoc c-table    '1. **one.** its lead\n\n| a | b |\n|---|---|\n| c | d |\n\n   an indented paragraph after a column-0 table\n'
cdoc c-nested   '- **outer.** its lead\n\n  - **inner.** a nested item sitting at the parent content column\n\n  a paragraph after the nested list\n'

cexpect() {
  got="$(node "$here/check-continuations.js" "$tmp/.fx/cont/$1" 2>&1)"
  case "$got" in
    *"$2"*) printf 'PASS  cont  %-16s %s\n' "$1" "$3" ;;
    *) printf 'FAIL  cont  %-16s wanted "%s", got "%s"\n' "$1" "$2" "$got"; fail=1 ;;
  esac
}
cexpect c-one     '1 skill(s) checked, 0 with defects' 'one continuation is the cap, not a defect'
cexpect c-two     '2 continuation paragraphs, cap is 1' 'a second paragraph is a second claim'
cexpect c-bold    'bolded lead-in'                      'a bolded continuation is over the cap at one'
cexpect c-fence0  '1 skill(s) checked, 0 with defects'  'a column-0 fence with an indented body is not a continuation'
cexpect c-fencein '1 skill(s) checked, 0 with defects'  'a fence under an item is not one of its paragraphs'
cexpect c-wide    '1 skill(s) checked, 0 with defects' 'the content column follows the marker, not a fixed two'
cexpect c-tick    '2 continuation paragraphs, cap is 1' 'a continuation opening with a backtick still counts'
cexpect c-runon   '2 continuation paragraphs, cap is 1' 'a marker running on from a paragraph still opens its item'
cexpect c-table   '1 skill(s) checked, 0 with defects'  'a column-0 table ends the list, so what follows it is orphaned'
cexpect c-nested  '1 skill(s) checked, 0 with defects'  'a nested item at the parent column is an item, not a paragraph'

# The frontmatter block scalar is the shape that looked exactly like a
# continuation to a grep. Every fixture above carries one, so a check that
# counted them would fail c-one rather than needing a fixture of its own; this
# one asserts it explicitly against a scalar of several lines.
mkdir -p .fx/cont/c-scalar
printf -- '---\nname: c-scalar\ndescription: |\n  a first line of the scalar\n  a second line of the scalar\nallowed-tools:\n  - Read\n---\n\n    an indented paragraph the sequence item would claim\n\n    and a second one\n' > .fx/cont/c-scalar/SKILL.md
cexpect c-scalar '1 skill(s) checked, 0 with defects' 'frontmatter is not body: its sequence claims nothing below'

cempty="$(node "$here/check-continuations.js" "$tmp/empty")"; cempty_code=$?
case "$cempty$cempty_code" in
  *'nothing was checked1') printf 'PASS  cont  %-16s %s\n' empty-target 'nothing was checked, exit 1' ;;
  *) printf 'FAIL  cont  %-16s got "%s" exit %s\n' empty-target "$cempty" "$cempty_code"; fail=1 ;;
esac

cpkg="$(node "$here/check-continuations.js" "$tmp/.fx/pkg")"; cpkg_code=$?
case "$cpkg$cpkg_code" in
  *'2 skill(s) checked, 0 with defects0') printf 'PASS  cont  %-16s %s\n' package-root 'the skills under a package root' ;;
  *) printf 'FAIL  cont  %-16s got "%s" exit %s\n' package-root "$cpkg" "$cpkg_code"; fail=1 ;;
esac

# The rule reaches every markdown file a skill keeps, not only its SKILL.md.
mkdir -p .fx/cont/c-sub/workflows
printf -- '---\nname: c-sub\ndescription: |\n  x\n---\nbody\n' > .fx/cont/c-sub/SKILL.md
printf -- '- **lead.** first\n\n  the reason\n\n  a second paragraph\n' > .fx/cont/c-sub/workflows/w.md
cexpect c-sub '2 continuation paragraphs, cap is 1' 'a workflow file is read, not only SKILL.md'

mkdir -p .fx/cont/c-ext
printf -- '---\nname: c-ext\ndescription: |\n  x\n---\nbody\n' > .fx/cont/c-ext/SKILL.md
printf -- '- **lead.** first\n\n  the reason\n\n  a second paragraph\n' > .fx/cont/c-ext/notes.txt
cexpect c-ext '1 skill(s) checked, 0 with defects' 'a non-markdown file is not prose the rule reaches'

[ "$fail" -eq 0 ] && echo 'ALL CHECKS VERIFIED' || echo 'BENCH FAILED'
exit "$fail"
