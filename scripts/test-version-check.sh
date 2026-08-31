#!/usr/bin/env bash
# Regression bench for version-check.py. Run it after any edit to that file.
#
# It exists because a check that has only ever been seen to pass is indistinguishable
# from one that passes on everything. The first two cases replay real commits of this
# repository: 390f9e5 changed six gh-solo files and left the version at 3.0.0, which is
# the failure this check was written for, and 91933a2 touched repository-level files
# only, which must stay quiet. The rest are synthetic, for shapes the history has not
# produced yet.
set -euo pipefail

CHECK="$(cd "$(dirname "$0")" && pwd)/version-check.py"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
SYNTH="$(mktemp -d)"
trap 'rm -rf "$SYNTH"' EXIT

fails=0

expect() {
  local want="$1" repo="$2" range="$3" name="$4" match="${5:-}"
  local out status
  set +e
  out="$(cd "$repo" && python3 "$CHECK" "$range" 2>&1)"
  status=$?
  set -e
  if [ "$status" != "$want" ]; then
    printf '  FAIL %s -> exit %s, wanted %s\n' "$name" "$status" "$want"
    printf '       %s\n' "$out"
    fails=$((fails + 1))
    return
  fi
  if [ -n "$match" ] && ! printf '%s' "$out" | grep -q -- "$match"; then
    printf '  FAIL %s -> exit %s, but never said %s\n' "$name" "$status" "$match"
    printf '       %s\n' "$out"
    fails=$((fails + 1))
    return
  fi
  printf '  ok   %s\n' "$name"
}

# The synthetic repository, one commit per shape. Each range below is one commit
# against its parent, which is the check's single-revision form.
git -C "$SYNTH" init -q -b main .
git -C "$SYNTH" config user.email bench@example.invalid
git -C "$SYNTH" config user.name bench

echo 'a repository' > "$SYNTH/README.md"
git -C "$SYNTH" add .
git -C "$SYNTH" commit -qm 'the root commit, carrying no package'

mkdir -p "$SYNTH/skills/thing"
printf -- '---\nname: thing\nmetadata:\n  version: "1.0.0"\n---\n\nbody\n' > "$SYNTH/skills/thing/SKILL.md"
git -C "$SYNTH" add .
git -C "$SYNTH" commit -qm 'add the package'
ADDED="$(git -C "$SYNTH" rev-parse HEAD)"

printf -- '---\nname: thing\nmetadata:\n  version: "1.0.0"\n---\n\nbody, edited\n' > "$SYNTH/skills/thing/SKILL.md"
git -C "$SYNTH" commit -qam 'change it without moving the version'
STUCK="$(git -C "$SYNTH" rev-parse HEAD)"

printf -- '---\nname: thing\nmetadata:\n  version: "1.1.0"\n---\n\nbody, edited again\n' > "$SYNTH/skills/thing/SKILL.md"
git -C "$SYNTH" commit -qam 'change it and move the version'
MOVED="$(git -C "$SYNTH" rev-parse HEAD)"

printf -- '---\nname: thing\n---\n\nbody, unversioned\n' > "$SYNTH/skills/thing/SKILL.md"
git -C "$SYNTH" commit -qam 'drop the version field'
UNVERSIONED="$(git -C "$SYNTH" rev-parse HEAD)"

mkdir -p "$SYNTH/docs/plans"
echo 'a plan' > "$SYNTH/docs/plans/plan.md"
git -C "$SYNTH" add .
git -C "$SYNTH" commit -qm 'touch repository-level files only'
REPO_ONLY="$(git -C "$SYNTH" rev-parse HEAD)"

echo 'must refuse:'
expect 1 "$HERE" 390f9e5 'the real commit that broke the rule' 'plugins/gh-solo'
expect 1 "$SYNTH" "$STUCK" 'a skill changed with its version standing still' 'stayed at 1.0.0'
expect 1 "$SYNTH" "$UNVERSIONED" 'a changed skill declaring no version' 'declares no metadata.version'

echo 'must stay quiet:'
expect 0 "$HERE" 91933a2 'a real commit touching no package'
expect 0 "$SYNTH" "$ADDED" 'a package added on the branch'
expect 0 "$SYNTH" "$MOVED" 'a skill changed with its version moved'
expect 0 "$SYNTH" "$REPO_ONLY" 'repository-level files only'

printf '\n%s failure(s)\n' "$fails"
[ "$fails" = 0 ]
