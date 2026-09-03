> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Scale the review round to the change

Closes #17. The round gains a **reduced path**: the reviewer still reads the whole branch and its findings still land as threads, and then the round stops at the owner instead of planning fixes, making them and having them checked. A separate and narrower knob suppresses only the re-review, keeping the unattended fix. Which path ran is named in the round report, and `plugins/gh-solo/skills/pr-flow/workflows/merge.md` gains a gate for the state any of them can leave behind.

It is the third branch of the #26 stack, cut from #16's tip and stacked on PR #68.

## What is never reduced, and why that is the whole design

**The reviewer's own pass survives every path.** It is the only thing standing between the author and their own judgement, and #17's third acceptance criterion says so outright. What the reduced path drops is the *unattended* machinery after it - the fix plan, the fix, the re-review - which exists because nobody is watching. On a change the owner can read in one screen they are the cheapest reader of the fix and one step away anyway.

**A reduced round still spends the pull request's one full pass.** It is a whole-branch reading and its record Review carries `PASS_MARKER` like any other, so the cap #16 landed counts it. Stated because "reduced" otherwise invites the reading that it is free, and a free path around a cap is not a cap.

**Findings are not orphaned by dropping the fix.** The owner judges them at the protocol's step 6 exactly as they do on a full round, and an order in a thread reaches `plugins/gh-solo/skills/implement/workflows/fix.md` through the discuss round or through `fix <pr-number>`. Neither of those has ever drawn a re-review, so the reduced path asks for no new machinery - it stops before machinery that already had an owner-driven alternative.

## The measure, and why the plan file is excluded

**The size signal costs no request.** `gh pr view --json files` returns a per-path `additions` and `deletions`, and the preliminaries in `plugins/gh-solo/skills/pr-flow/workflows/review.md` already make that call for the emptiness test; `files` joins the field list it already passes. `gh pr list --json` carries `additions`, `deletions` and `changedFiles` too, which is what lets the scope step *display* the path per pull request without deciding it there.

**The plan file is excluded from the measure**, which is the question #17 says to settle first. On `izkreny/groupifico#190` the plan file was most of the diff and none of the risk, so a measure counting it calls that pull request large and the reduced path never fires on the case it was written for. This branch is its own second example: 353 additions across 9 files, of which the plan is 83 in a file nothing executes.

**It is excluded by filename pattern rather than by directory**, so no per-repository key is needed: the plan's name is `YYYY-MM-DD_GHI-{issue-number}_{slug}.md` per Step 2 of `plugins/gh-solo/skills/pr-flow/workflows/open.md`, and the issue number is already parsed from the branch. A repository keeping plans somewhere other than `docs/plans/` therefore needs no configuration, and a file matching that pattern anywhere in the diff is the branch's plan.

**Where the decision fires: the preliminaries, per pull request.** That is the step holding `files`, so it is the only place the exclusion can be computed. The scope step names the resulting path beside each pull request in its confirmation prompt, so the owner approves "one full, one reduced" rather than a count.

## What the repository's gates change, and what they never change

**Green gates reduce what a re-review has left to establish, and never to zero** - #17's eighth and ninth criteria, which land as one pair of paragraphs in `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` because they have one conclusion between them. Where `## Verification` runs the changed code, a fix that broke something is likelier to be caught by the suite than by a reading. Where the repository has no CI and no build - which `.agents/gh-solo.md` states of this one in its first line - the pass is checking something no gate touches at all.

**Two things no suite can establish however green it is.** That a fix closed the finding it claims to close: the gates were green before the fix and are green after, and neither run knows what the thread said. And that a spec the fix added is not a tautology: a test asserting what the code just did passes forever and proves nothing.

**So the reduced path drops the re-review because nothing was fixed unattended, never because the gates covered it.** That distinction is the load-bearing one: the first reason survives a repository with no gates at all, and the second would quietly make the pass optional wherever a suite is green.

## Steps

- Add the reduced path to `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` as its own section: what makes a change small enough, evaluated before the diff is read; that it runs steps 1 and 2 and then stops at step 6; that the reviewer's pass and the posting are never what gets dropped; and that it still spends the pull request's one full pass.
- Add the suppress-the-re-review knob to that file as a distinct entrance: steps 1 to 4 and then the stop, so the unattended fix survives and only the verdict is gone. Say why it cannot stand in for the reduced path, and vice versa, per #17's tenth criterion.
- Add the gates pair to that file: what green gates reduce, the two things they can never establish, and that the reduced path's reason for dropping the re-review is the absence of an unattended fix.
- Say in that file that whether the re-review becomes opt-in is settled from a round's recorded cost per #25 and not from argument, that those figures do not exist yet, and that the default therefore stands - #17's eleventh criterion, which asks for the reasoning rather than for a new default.
- Add `files` to the preliminaries' `gh pr view --json` list in `plugins/gh-solo/skills/pr-flow/workflows/review.md`, and compute the path there: the measure over every changed file except the branch's own plan, matched by the filename pattern.
- Add `additions`, `deletions` and `changedFiles` to the scope step's `gh pr list --json` in that file, and name the path per pull request in the confirmation prompt so the owner approves the paths rather than a count.
- Add the owner's override at the entrance in that file, per #17's seventh criterion: it forces the reduced path for one round, overriding the measure, and it is recorded in the round report as an override rather than as a measurement.
- Branch after Step 2 in that file: on the reduced path go straight to the stop, and say that an owner-ordered fix afterwards reaches `fix <pr-number>` and draws no re-review, so nothing is left orphaned.
- Have the round report in that file name which path ran and why - measured or overridden - so a reduced round can never be mistaken for a full one on the same pull request.
- Add the gate to `plugins/gh-solo/skills/pr-flow/workflows/merge.md`: a round record with no re-review record after it, carrying fix commits that landed after that record, means those fixes were verified by nobody but their author. State it on the observable rather than on the path name, so it holds for the reduced path, the suppress knob and a discuss-ordered fix alike.
- Update the `review` rows in `plugins/gh-solo/skills/pr-flow/workflows/help.md` and the routing in `plugins/gh-solo/skills/pr-flow/SKILL.md` for the override argument, and the round description at item 5 of that help file, which currently promises a re-review on every round.
- Add a paragraph to `plugins/gh-solo/skills/pr-flow/README.md` on the reduced path, since it changes what the owner is asked to approve.
- Move `plugins/gh-solo/.claude-plugin/plugin.json` to `4.4.0`, per the version argument below.

**Out of scope: forcing the reduced path from `auto` or `go`.** Those chains take an issue or a pull request number and nothing else, and widening their argument grammar is a separate change to a separate file.

## Why the version moves the minor

A round that measures large behaves exactly as it does today, the override is a new argument nothing currently passes, and the new merge gate fires only on a state no path could previously produce unattended. Nothing that worked stops working, so `AGENTS.md` puts this at the minor.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans --ignore '.claude/*' --ignore 'docs/plans*' --ignore '*GHI-50*'`, run as its own command with its exit code read before anything that depends on it.
- `python3 scripts/version-check.py 8408158..HEAD`, given the range explicitly: the default `origin/main...HEAD` spans two prior bumps on the branches below this one in the stack, so it passes whether or not this branch moved its own version.
- `python3 scripts/manifest-check.py`
- `bash plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh`

**What none of these gates can see:** every one of them is a documentation check, because this branch adds no code. Whether the threshold actually separates the changes that deserve a full round from those that do not is only visible over several real rounds, and this branch cannot produce them - a round runs the *installed* plugin, which stays at the last tagged version until the #26 stack merges. That is the owner's judgement after the tag.

## Open questions

- **What is the threshold, and is the excluded-plan measure the right shape?** My recommendation: reduced when the diff outside the plan file touches at most 2 files and at most 40 added-plus-deleted lines. The rationale is #17's own proxy, a change the owner can read in one screen, and `#190` sits well inside it at 1 file and 16 lines while this branch sits well outside at 8 files and 270 lines. The number is yours; the plan-file exclusion I would keep whatever number you pick, since without it the path never fires on the case it exists for.
- **What is the override's syntax at the entrance?** My recommendation: `review <pr-number> reduced`, matching the existing `ready review` pattern of a second bare word rather than a flag, and `review <pr-number> no-recheck` for the suppress knob. Both need a row in `plugins/gh-solo/skills/pr-flow/workflows/help.md` and a routing line in `plugins/gh-solo/skills/pr-flow/SKILL.md`, so the wording is worth settling before it lands in two files.

## Settled

None yet.
