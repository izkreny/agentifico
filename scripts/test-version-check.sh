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

# The fixture's own git calls read no configuration but their own, so signing, hooks or
# templates set up on the machine cannot stop the bench before a case has run.
fgit() {
  GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null git -C "$SYNTH" "$@"
}

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

skill() {
  printf -- '---\nname: thing\nmetadata:\n  version: "%s"\n---\n\n%s\n' "$1" "$2" \
    > "$SYNTH/skills/thing/SKILL.md"
}

other() {
  printf -- '---\nname: other\nmetadata:\n  version: "%s"\n---\n\n%s\n' "$1" "$2" \
    > "$SYNTH/skills/other/SKILL.md"
}

# The synthetic repository. Each single-commit range below is one commit against its
# parent; the two-dot and three-dot cases at the end cover the other range forms, which
# are the ones a real gate run takes.
fgit init -q -b main .
fgit config user.email bench@example.invalid
fgit config user.name bench

echo 'a repository' > "$SYNTH/README.md"
fgit add .
fgit commit -qm 'the root commit, carrying no package'

mkdir -p "$SYNTH/skills/thing"
skill 1.0.0 'body'
fgit add .
fgit commit -qm 'add the package'
ADDED="$(fgit rev-parse HEAD)"

skill 1.0.0 'body, edited'
fgit commit -qam 'change it without moving the version'
STUCK="$(fgit rev-parse HEAD)"

skill 1.1.0 'body, edited again'
fgit commit -qam 'change it and move the version'
MOVED="$(fgit rev-parse HEAD)"

skill 0.9.0 'body, edited once more'
fgit commit -qam 'change it and move the version backwards'
BACKWARDS="$(fgit rev-parse HEAD)"

printf -- '---\nname: thing\n---\n\nbody, unversioned\n' > "$SYNTH/skills/thing/SKILL.md"
fgit commit -qam 'drop the version field'
UNVERSIONED="$(fgit rev-parse HEAD)"

fgit rm -q -r skills/thing
fgit commit -qm 'retire the package'
RETIRED="$(fgit rev-parse HEAD)"

mkdir -p "$SYNTH/skills"
echo 'what lives here' > "$SYNTH/skills/README.md"
fgit add .
fgit commit -qm 'add a file directly under skills'
STRAY="$(fgit rev-parse HEAD)"

mkdir -p "$SYNTH/docs/plans"
echo 'a plan' > "$SYNTH/docs/plans/plan.md"
fgit add .
fgit commit -qm 'touch repository-level files only'
REPO_ONLY="$(fgit rev-parse HEAD)"

# Two side branches off ADDED, so the three-dot form has a merge base to find.
fgit checkout -q -b side-moved "$ADDED"
skill 2.0.0 'body, on a branch'
fgit commit -qam 'change it on a branch and move the version'
SIDE_MOVED="$(fgit rev-parse HEAD)"

fgit checkout -q -b side-stuck "$ADDED"
skill 1.0.0 'body, on another branch'
fgit commit -qam 'change it on a branch without moving the version'
SIDE_STUCK="$(fgit rev-parse HEAD)"

fgit checkout -q main

# A second package, carrying a file beside its manifest, so the manifest can be deleted
# while the package itself survives. Both shapes below are read off it.
mkdir -p "$SYNTH/skills/other/references"
other 1.1.0 'body'
echo 'a reference' > "$SYNTH/skills/other/references/notes.md"
fgit add .
fgit commit -qm 'add a second package with a file beside its manifest'

other 1.1 'body, edited'
fgit commit -qam 'rewrite the version with one dotted part fewer'
SHORTENED="$(fgit rev-parse HEAD)"

fgit rm -q skills/other/SKILL.md
echo 'a reference, edited' > "$SYNTH/skills/other/references/notes.md"
fgit commit -qam 'delete the manifest while the rest of the package stays'
ORPHANED="$(fgit rev-parse HEAD)"

# A directory under skills/ that never carries a manifest, then scrapped wholesale. The
# survival test draws the retirement boundary here, and neither side of it is an
# acceptance criterion of #41, so nothing else would catch it moving.
mkdir -p "$SYNTH/skills/legacy"
echo 'no manifest here' > "$SYNTH/skills/legacy/notes.md"
fgit add .
fgit commit -qm 'add a directory that never carries a manifest'
UNMANIFESTED="$(fgit rev-parse HEAD)"

fgit rm -q -r skills/legacy
fgit commit -qm 'scrap that directory wholesale'
SCRAPPED="$(fgit rev-parse HEAD)"

echo 'must refuse:'
expect 1 "$HERE" 390f9e5 'the real commit that broke the rule' 'plugins/gh-solo'
expect 1 "$SYNTH" "$STUCK" 'a skill changed with its version standing still' 'stayed at 1.0.0'
expect 1 "$SYNTH" "$BACKWARDS" 'a version moved backwards' 'went back from 1.1.0 to 0.9.0'
expect 1 "$SYNTH" "$UNVERSIONED" 'a changed skill declaring no version' 'declares no metadata.version'
expect 1 "$SYNTH" "$ADDED..$STUCK" 'the two-dot form over a standing-still version' 'stayed at 1.0.0'
expect 1 "$SYNTH" "main...$SIDE_STUCK" 'the three-dot form over a standing-still version' 'stayed at 1.0.0'
expect 1 "$SYNTH" "$SHORTENED" 'a version rewritten with one dotted part fewer' 'stayed at 1.1 ('
expect 1 "$SYNTH" "$ORPHANED" 'a manifest deleted while its package survives' 'carries no skills/other/SKILL.md'
expect 1 "$SYNTH" "$UNMANIFESTED" 'a live directory that carries no manifest' 'carries no skills/legacy/SKILL.md'

echo 'must stay quiet:'
expect 0 "$HERE" 91933a2 'a real commit touching no package'
expect 0 "$SYNTH" "$ADDED" 'a package added on the branch'
expect 0 "$SYNTH" "$MOVED" 'a skill changed with its version moved'
expect 0 "$SYNTH" "$RETIRED" 'a package retired'
expect 0 "$SYNTH" "$SCRAPPED" 'a directory that never carried a manifest, scrapped'
expect 0 "$SYNTH" "$STRAY" 'a file directly under skills, owned by no package'
expect 0 "$SYNTH" "$REPO_ONLY" 'repository-level files only'
expect 0 "$SYNTH" "$ADDED..$MOVED" 'the two-dot form over a moved version'
expect 0 "$SYNTH" "main...$SIDE_MOVED" 'the three-dot form over a moved version'

printf '\n%s failure(s)\n' "$fails"
[ "$fails" = 0 ]
