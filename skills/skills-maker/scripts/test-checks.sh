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
  for g in good-block good-quoted; do
    if printf '%s\n' "$dout" | grep -q "^$g/"; then
      printf 'FAIL  diff  %-14s flagged a good fixture\n' "$g"; fail=1
    else
      printf 'PASS  diff  %-14s clean\n' "$g"
    fi
  done
else
  echo 'SKIP  differential: no ruby on this machine'
fi

[ "$fail" -eq 0 ] && echo 'ALL CHECKS VERIFIED' || echo 'BENCH FAILED'
exit "$fail"
