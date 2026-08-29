> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Pin the reviewer's budget and what it reads

Implements #25, the first child of epic #26. The reviewer's two cost knobs stop being accidents, the scoped re-review stops reading the whole branch's context, and a round records what it spent.

## Why now

`plugins/gh-solo/agents/reviewer.md` declares `model: inherit` and `effort: xhigh`, and neither entrance can vary them, so the scoped re-review is budgeted like a cold read of an entire branch. The measured evidence on the issue could not be attributed: the fetch list the reviewer runs is unconditional, so an unknown share of a rescope pass is context loading that no budget knob reduces. Every other child of #26 is judged by whether it saved anything, and nothing can measure that until this branch lands.

## The two knobs are deliberately asymmetric

**`effort` is pinned, at `high`.** Its documented default is to inherit the session's level, so omitting the line makes the depth of a review depend on whatever the orchestrating session was set to - which is the author's session. Pinning decouples the review's depth from the author's convenience in both directions: a session on a lower level still gets a `high` reviewer.

**`model` stays `inherit`.** The model is the axis where following the session is correct. This plugin ships to repositories whose owners pay for their own models, so a model name pinned here would override every consumer and would date the file the next time model ids move. A repository that wants otherwise says so in its own config, which is what `Reviewer model:` below is for.

**The file has to say this.** The asymmetry looks like an oversight, and the next reader will tidy it away unless the reason sits next to it.

## The environment can outrank both, and the file records that rather than guessing

The documented precedence puts an environment variable above a subagent's own frontmatter for effort, and above both the per-invocation parameter and the frontmatter for the model. So a pinned `effort` and a passed `model` are both requests rather than guarantees.

This branch does not attempt to determine what any particular environment sets. It states the precedence where the values are declared, and it makes the round report say which model the round *asked for* - because a report claiming a model that an environment replaced is worse than a report with no model in it, and the comparison between rounds that #26 is built on would rest on it.

## The rescope entrance reads less, and that is where the cost is

`plugins/gh-solo/skills/reviewer/SKILL.md` numbers what the reviewer fetches before it reads anything, and the scoped re-review narrows the diff without narrowing that list. So both passes pay for the pull request, the issue, the plan file, the repository's standards and the engineering baseline, and only the diff differs.

The rescope entrance is given a conditional list, and it keeps only what its two questions need: the findings it was handed, the fix commits it reads locally with `git`, the repository's standards and the baseline, since a new defect is judged against those. It skips the pull request, the issue, the plan file and the whole-branch diff - neither question consults any of them, and each one widens the pass back towards the whole-branch re-judging this branch exists to cut.

**The cost of skipping the issue is stated rather than hidden.** A new defect the rescope finds is a `standards` finding, because with the acceptance criteria out of the pass the spec axis has no spec to judge against. What backstops that is the owner's own read of the fix diff and the next full pass, both of which have the issue.

**Skipping the plan file also removes the source of the findings the issue complains about.** Two of the four findings on the measured pass were plan-file staleness, whose remedy the flow forbids. That is not sufficient on its own: the full pass still reads the plan, so the rule below is what stops it there.

## The plan file is intent, and staleness is not a defect

The plan records what the branch intended at plan time and is frozen afterwards - `plugins/gh-solo/skills/implement/SKILL.md` makes editing it to record divergence a hard rule, because the gap between intent and outcome belongs in a PR comment. The reviewer is spawned with a pull request number and reads the diff, so the plan arrives looking like any other changed file, and a reviewer that does not know it is frozen reads drift as a defect.

**The rule has to name both axes.** Plan staleness lands as `spec` at least as readily as `standards` - the plan is a spec source by this skill's own design, quoted per finding - so barring it on one axis only returns it relabelled on the other.

**What the plan is still for stays.** It is quoted per finding as a spec source, and work the issue never asked for remains an ordinary `spec` finding against the issue's acceptance criteria. The rule bars a finding whose whole content is that the plan and the code disagree, not the plan's use as evidence.

## A round records what it spent

The reviewer cannot measure its own token use. Those figures exist in what the spawn returns to the orchestrator, so the orchestrator records them and the reviewer's report is not asked for a number it would have to invent.

## Steps

- Change `effort: xhigh` to `effort: high` in `plugins/gh-solo/agents/reviewer.md`, keep `model: inherit`, and state in that file's body why the two knobs are treated differently and that an environment variable outranks either.
- Add `Reviewer model:` to the per-repository config key list in `plugins/gh-solo/skills/pr-flow/SKILL.md`, beside `Reviewer agent:` and `Reviewer command:`.
- Add the same key to the enumeration of `.agents/gh-solo.md` keys in `plugins/gh-solo/skills/tracker/SKILL.md`, which states that set in full.
- In *Step 1 - Review* of `plugins/gh-solo/skills/pr-flow/workflows/review.md`, read `Reviewer model:` and pass it on the spawn, validate it against the names the spawn parameter accepts, and refuse the round on an unrecognised value with the wording the unregistered-agent refusal already uses.
- In that file's *Where the appointed reviewer is a command* subsection, state that `Reviewer model:` does not apply to a capability that is invoked rather than spawned, so the key cannot become a silent no-op there.
- In that file's *Stop at the owner* round report, add the model the round requested, that an environment variable outranks that request, and the pass's token count, tool-call count and wall clock as the spawn reported them.
- Extend the same file's standing sentence that the round report always names which reviewer ran, so it names the requested model too. That sentence is a separate mandate from the report's field list, and a field added to one and not the other gets dropped silently.
- In `plugins/gh-solo/skills/reviewer/SKILL.md`, make the *Fetch your own context* list conditional on the entrance, and have *The scoped re-review* name each item it skips and why, including that a new defect it finds is a `standards` finding because the spec axis has no spec in that pass.
- In the same file, state that the plan file records intent frozen at plan time, that a gap between it and the code is a finding on neither axis, and that the plan remains a spec source quoted per finding.
- Read *The second pass* in `plugins/gh-solo/skills/reviewer/README.md` and update it only if the conditional fetch list makes its description wrong. It describes the pass's two questions, which do not change, so the expected outcome is no edit.
- Bump `plugins/gh-solo/.claude-plugin/plugin.json` to `2.1.0`, and only that file.
- Leave `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` untouched unless a step above contradicts it, in which case the protocol is what the workflow is corrected against.

## Verification

Gates, each with an exit code:

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans --ignore '.claude/*' --ignore 'docs/plans*' --ignore '*GHI-50*'`, the command `.agents/gh-solo.md` states for this repository, read by exit code and never through a pipe.
- `grep -c 'effort: xhigh' plugins/gh-solo/agents/reviewer.md` returns zero, and `grep 'effort: high'` finds it.
- `grep 'Reviewer model:'` finds it in `plugins/gh-solo/skills/pr-flow/SKILL.md`, `plugins/gh-solo/skills/tracker/SKILL.md` and `plugins/gh-solo/skills/pr-flow/workflows/review.md`. A hit in fewer than all three means an enumeration site was missed, which is this change's most likely failure.
- `python3 -c "import json,sys; d=json.load(open('plugins/gh-solo/.claude-plugin/plugin.json')); sys.exit(0 if d['version']=='2.1.0' else 1)"`.
- **Every grep above is run against `origin/main` as well, and must fail there.** A check that passes before the change is indistinguishable from one that passes on anything.
- `git diff --stat origin/main` names exactly the files the steps list and this plan, and nothing else.

**No skills-maker box.** Per *The skill review is its own issue, not a branch's gate* in `.agents/gh-solo.md`, a whole-skill review is never a `## Verification` entry, and this branch changes skill files. It is stated here because a reader of this plan will look for that box.

**No `[owner]` box either.** Every box in this section has to close before merge, and `plugins/gh-solo/skills/pr-flow/workflows/ready.md` and `plugins/gh-solo/skills/pr-flow/workflows/merge.md` both refuse on an empty one, so a box whose evidence cannot exist until after the merge is a box that blocks its own branch. Judgement the owner alone can make is stated as prose below instead, where it informs the read of the diff without gating it.

What these gates cannot see: whether an agent following the new instructions behaves differently. Every change here is prose that an agent reads, so no test in this repository can be made to fail on the pre-change wording - the greps prove the text moved, never that the behaviour did. That is the owner's read of the diff. Two things in particular are observable only after the plugin ships, because a round in this repository runs the installed plugin rather than the working tree: whether the round report's new fields arrive populated, since nothing here executes an instructions file; and whether an environment variable in the owner's own setup defeats the pinned `effort`, which a subagent cannot see from inside, so the diff records the documented precedence and claims nothing further.

## Open questions

None.

## Settled

- **The rescope entrance skips the issue, and the pull request with it.** Settled by the owner: drop the issue, drop the plan, keep only the bare essentials named above. Its two questions are answered from the findings it was handed and the fix commits, so what it keeps is those plus the repository's standards and the baseline. The cost is that a new defect it finds can only be a `standards` finding, backstopped by the owner's read of the fix diff and by the next full pass.
- **#25's criterion that the rescope cost be attributed before and after cannot close on this branch.** Settled by the owner: it cannot. The "before" figure was measured by hand on another repository's pull request, and the instrumentation that would produce a comparable one is what this branch adds, so the first measurement is recorded here and the comparison belongs to a later round. The criterion stays unticked at merge, where `plugins/gh-solo/skills/pr-flow/workflows/merge.md` reports an unticked acceptance criterion and asks rather than refusing.
- **`effort` is pinned at `high` and `model` stays `inherit`.** Settled by the owner, against the alternative of removing the `effort` line entirely: removing it makes the reviewer inherit the author's session, which removes the ceiling rather than lowering it.
- **The version moves on this branch, to `2.1.0`.** Settled by the owner. Precedent is #21, which bumped `2.0.0` to `2.0.1` in the same commit as its fix, so this plugin bumps per branch rather than at a release; a new configuration key is additive, so the minor segment moves.
- **Only `plugins/gh-solo/.claude-plugin/plugin.json` carries a version to move.** `AGENTS.md` says a plugin's version lives there "and its marketplace entry", but `.claude-plugin/marketplace.json` has no version field at all, so there is nothing in it to bump. That disagreement is a defect in `AGENTS.md` rather than in this branch, and fixing it here would put a second decision behind one review.
