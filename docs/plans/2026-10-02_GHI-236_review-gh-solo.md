> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Review the gh-solo package before its next tag

Issue [#236](https://github.com/izkreny/agentifico/issues/236), the sweep of `plugins/gh-solo` at 4.12.0, cut from the trunk at e9cfedc. The last tag, `gh-solo_4.8.0`, sits at 81332cf.

## The sweep

A reviewer subagent on Opus ran `/skills-guru review plugins/gh-solo` on 2026-10-02, following `skills/skills-guru/workflows/review.md` inline over the package root in one pass, and is kept resumable for its Step 5. It read all 58 files under the package whole, the marketplace entry included, and skipped only the bytecode cache. The mechanical check, the five benches and the manifest check all exit 0 at the base, so every finding below comes from the reading, and each one marked as probed was confirmed by running the script rather than by reading it. The findings are recorded on the issue as SW1 to SW22, ranked by consequence, and each is fixed here. None is set aside as phantom: every citation was re-read against the tree before this plan was written.

The script findings, each probed:

- **SW1.** `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` counts a reply as a finding's thread when any line of it opens with `RF{n} `, so a held finding whose id is named at the start of a line in any reply is skipped by `release` and passed by `unthreaded`, and the merge gate lands it unthreaded. `threaded_ids` reads only thread roots, which means `comment_bodies` or a sibling keeps each comment's `in_reply_to_id`. The bench's bare `RF7 x` fixture becomes a root comment, and a reply opening `RF9 ` gains a case that must not count. The reviewer's optional narrowing of `LEGACY_PATTERN` to a severity-bearing line is not taken, since that pattern also feeds `highest-id` and `verify` and the finding does not need it.
- **SW2.** `release` in the same script tests whether an anchor sits inside the pull request's diff only for a rewritten line, so a moved or unchanged held line outside the diff sinks the whole atomic post with a 422, and the retry `plugins/gh-solo/skills/pr-flow/workflows/resolve.md` names rebuilds the same payload. The membership test applies to every anchored entry, an entry outside the diff goes to `unthreadable` with its reason, and the bench's `release-shift` and `release-noshift` fixtures get a base that predates the finding's line, beside a new moved-outside-the-diff case. Step 6 of the resolve workflow fetches `<remote> <base-branch>` before `release`, since `diff_lines` reads the local tracking ref, and that workflow states the rule for every anchor rather than the rewritten one.
- **SW3.** `plugins/gh-solo/assets/GhSolo/PlanSteps.yml`, `plugins/gh-solo/assets/GhSolo/PlanVerification.yml` and `plugins/gh-solo/assets/GhSolo/PlanCheckbox.yml` are raw-scope regexes with no fence awareness, so a plan quoting `## Verification` inside a fence passes with no real section, and a plan quoting a checkbox inside a fence fails. Each becomes fence-aware the way `plugins/gh-solo/assets/GhSolo/PlanVerificationList.yml` already is, and the bench gains both shapes.
- **SW4.** `plugins/gh-solo/hooks/ask-before-trunk-push.py` does not know that `-c`, `--config-env` and `--namespace` take a value, so `git -c key=val push origin main` reaches the trunk without the confirmation `plugins/gh-solo/README.md` promises. Those three join a set of value-taking global options kept apart from the push flags, and `git -c k=v push origin main` joins the bench's must-ask cases.
- **SW5.** `plugins/gh-solo/skills/pr-flow/scripts/watch.py` skips a review body or a reaction stamped at the boundary second, where `plugins/gh-solo/skills/pr-flow/workflows/watch.md` says every boundary overlaps. Both filters become strict, `seen` drops the repeat, and the bench gets a record stamped exactly at `since` that must emit once.
- **SW11.** The posting script's docstring promises exit 1 on unusable arguments, but argparse exits 2, which `plugins/gh-solo/skills/pr-flow/workflows/merge.md` and the resolve workflow read as a refusal with no ids. Argparse errors exit 1, and the bench gets a case for a missing `--reviews`.
- **SW15.** `plugins/gh-solo/skills/pr-flow/scripts/docs-check.py` skips every span holding `..`, so none of the cross-skill pointers in the package is checked, and its bench covers only the plan tags. Such a span resolves against the file's own directory like any other, and the bench gains cases for an unclosed fence, a nested fence, `--ignore` and a broken `../` path.

The prose findings:

- **SW6.** Sites in `plugins/gh-solo/skills/pr-flow/workflows/open.md`, `plugins/gh-solo/skills/pr-flow/workflows/review.md`, the resolve workflow, `plugins/gh-solo/skills/implement/workflows/fix.md` and `plugins/gh-solo/skills/implement/workflows/implement.md` send *Never counted* and *Never capped* to the pr-flow `plugins/gh-solo/skills/pr-flow/SKILL.md`, which holds neither; both live in `plugins/gh-solo/skills/pr-flow/references/post-caps.md`, and each pointer is re-aimed there.
- **SW7.** `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` and `plugins/gh-solo/skills/reviewer/README.md` still name the review workflow as the owner of reviewer appointment, which #230 moved to `plugins/gh-solo/skills/pr-flow/references/reviewer-appointment.md`. Both are re-aimed.
- **SW8.** Since #230 the review workflow's reviewer resolution, head pin, spawn and discard record sit under the `#### At the cap` heading, so an agent navigating by heading reads the ordinary path as conditional. A heading returns before the resolution paragraph, and the cap's pointer aims at it.
- **SW9.** The plain path in `plugins/gh-solo/skills/pr-flow/workflows/stack.md` opens a child pull request without `--draft`, a title or a body file, so the child is born ready. It becomes the open workflow's Step 4 command plus `--base <parent>`.
- **SW10.** The resolve workflow's delta index credits a fix through a `Closes` list the fix workflow never defines. The fix workflow's Step 3 defines a `Closes: RF3, RF5` body line, and the resolve workflow cites it by heading.
- **SW12.** `plugins/gh-solo/README.md` says the merge gate treats the disclaimer as proof a review ran, which the merge workflow forbids; it says the gate reads the `via` line instead. The same README's line on plan edits names the one edit the flow does make after approval, a commit carrying a decision the owner settled.
- **SW13.** The convention-check Review in the review workflow and the thread reply in `plugins/gh-solo/skills/pr-flow/workflows/discuss.md` travel inline as `-f body='...'`, where an apostrophe breaks the post. Both take `-F body=@<file>`.
- **SW14.** The merge workflow loads its once-per-repository settings and branch-protection sections on every merge, claims a `delete_branch_on_merge` value it never read, and says the remote branch deletion has happened where it has not. The two sections move to `plugins/gh-solo/skills/pr-flow/references/repo-settings.md` (new) behind a one-line pointer, the remote-branch sentence defers to Step 4's own existence check, and the undo sentence names the squash and the issue close alone.
- **SW16.** The next-task query in `plugins/gh-solo/skills/tracker/workflows/search.md` sorts on `blocking` without fetching it. The field joins the `--json` list.
- **SW17.** `plugins/gh-solo/skills/tracker/references/github-access.md` says to create missing labels before a batch, where `plugins/gh-solo/skills/tracker/workflows/create.md` says to ask. The reference points at that step.
- **SW18.** The lifecycle diagram in `plugins/gh-solo/skills/tracker/README.md` goes from the owner judging findings straight to the squash, skipping `rnp` and `merge`. Both owner steps join it.
- **SW19.** The tools-used lines of the stack, review, resolve and auto workflows misstate what each file runs. Each is brought in step with its body.
- **SW20.** Four text defects: a clause in `plugins/gh-solo/skills/tracker/workflows/status.md` that does not parse, a position claim in `plugins/gh-solo/skills/pr-flow/SKILL.md`, a wrong table name in `plugins/gh-solo/skills/tracker/workflows/help.md`, and a stray apostrophe in the discuss workflow.
- **SW21.** The paragraph `plugins/gh-solo/skills/reviewer/workflows/full.md` is warned on carries four claims, and is split.
- **SW22.** The precedence list in `plugins/gh-solo/skills/reviewer/references/baseline.md` omits the repository-level `.claude` fallback that `plugins/gh-solo/skills/reviewer/SKILL.md` ranks. It points at that file's list instead of re-listing.

The reviewer also found, outside this package, that `.agents/gh-solo.md` lists no bench for the docs check, so no rule owes `plugins/gh-solo/skills/pr-flow/scripts/test-docs-check.sh` a run. SW15 edits that script, so this branch runs the bench anyway, and the missing rule is a `repo` issue opened from this branch rather than an edit here, per *A package-labelled child's criteria may not require editing a repository-level file without the owner's say* in `.agents/gh-solo.md`.

## The re-mine

A second subagent re-mined the phrase lists over everything merged since `gh-solo_4.8.0`, every package included, per *How a phrase list grows* in `skills/skills-guru/references/maintaining.md`. It read 17 findings on markdown paths, 10 threaded and 7 held, and about 45 fix commits from the heads of #225, #230, #233, #234 and #235, skipping what the #213 record already covers. It returns one token resting on a finding, `everything after this` for Position from #230 RF2, and two resting on a bare commit, `which half of` for Counts and `case` widening the ordinal Position token, both from #234's main rewrite. One History phrase, `different mechanisms now`, gets no token because any general form collides with that rule's own guards line. The tokens go to a `skills-guru` issue opened from this branch, never onto it, and the record of what was read goes on the issue.

## The version

`version` in `plugins/gh-solo/.claude-plugin/plugin.json` moves from `4.12.0` to `4.13.0`. SW10 adds a line the fix workflow now writes, SW15 widens what the docs check reads, and SW1, SW2, SW4, SW5 and SW11 change what a script does on an input that passes today; none removes or renames anything an installer calls.

## Steps

- Fix SW1, SW2 and SW11 in the posting script, one commit each citing its id, with the resolve workflow's Step 6 fetch and rule landing with SW2.
- Fix SW5 in the watch script, SW4 in the hook, SW3 in the plan rules and SW15 in the docs check, one commit each.
- Watch every new bench case fail before trusting it: each on the script as it stands before that commit's fix.
- Re-aim the pointers for SW6, SW7 and SW22 in one commit.
- Fix the structure for SW8, SW14 and SW21, with the new reference file landing with SW14.
- Fix the rules for SW9, SW10, SW13, SW16 and SW17.
- Fix the READMEs for SW12 and SW18, and the text for SW19 and SW20.
- Move `version` to `4.13.0`.
- Open the `skills-guru` issue carrying the three candidate tokens with their sources and tiers, and the `repo` issue for the docs-check bench rule.
- Post the re-mine record on the issue: the range, the findings and commits read, and the issue the tokens went to.
- Resume the sweep reviewer on the fix commits for a verdict per finding, per Step 5 of `skills/skills-guru/workflows/review.md`, and record the verdicts and the reviewer's id on the issue.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 scripts/version-check.py`
- `python3 scripts/manifest-check.py`
- `node skills/skills-guru/scripts/check.js plugins/gh-solo`
- `bash plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh`
- `bash plugins/gh-solo/skills/pr-flow/scripts/test-watch.sh`
- `bash plugins/gh-solo/skills/pr-flow/scripts/test-plan-check.sh`
- `bash plugins/gh-solo/skills/pr-flow/scripts/test-docs-check.sh`
- `bash plugins/gh-solo/hooks/test-ask-before-trunk-push.sh`

The benches see that each script now refuses or accepts the input its finding named, and the check sees that no token fires after the prose edits. What none of them reads is whether a re-aimed pointer lands on the heading its reader needs, or whether a split paragraph still says what its author meant. The resumed reviewer's verdicts judge those, and the owner accepts them on the diff.

## Open questions

None.

## Settled

None yet.
