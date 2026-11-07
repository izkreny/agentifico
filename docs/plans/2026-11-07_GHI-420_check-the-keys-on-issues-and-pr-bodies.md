> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Check the keys on issues and pull request bodies

Issue #420 holds the acceptance criteria. This plan says how.

## Approach

A new script, `plugins/gh-solo/skills/pr-flow/scripts/keys-check.py` (new), takes a body file and runs four Vale rules on it. It sits beside the plan check and reads the same `plugins/gh-solo/.vale.ini`. The caller fetches the body into a scratch file outside the working tree, per N2.

A pull request body's `## Steps`, `## Verification` and `## Open questions` are keyed exactly as a plan's are. So `GhSolo.PlanKeys` and `GhSolo.PlanKeyRepeat` already hold its rules, and both already accept a `- [ ]` before the key. Their messages say "plan" today, so they are reworded to fit a body too.

An issue body gets two new rules, `plugins/gh-solo/assets/GhSolo/IssueKeys.yml` (new) and `plugins/gh-solo/assets/GhSolo/IssueKeyRepeat.yml` (new). They are copies of the plan rules with a different map: `## Acceptance criteria` to `AC`, `## Technical notes` to `N`, `## Done when` to `D`. Vale scripts cannot share code, so each copy names its twin and the bench holds them in step. A removed line and a `READ` marker both open with the key, so they pass with no special case.

The script runs all four rules through Vale's `--filter`. Each pair is inert on the other surface, since an issue has no `## Steps` and a pull request has no `## Acceptance criteria`. The plan check gets a filter too, keeping it to the `GhSolo.Plan` rules, so a plan's own `## Technical notes` is never held to issue keys.

The tracker's validate runs the script for its two key rows, which needs `Bash(python3:*)` in the tracker's grant. `ready` and `merge` run it on the pull request body and refuse on exit 1, as they do for the criteria check. Pull requests opened before #267 carry no keys and will refuse until their bodies are keyed; N3 accepts that gap. This adds a refusal and breaks no file an installer wrote, by #268's reading, so the version moves a minor: `plugins/gh-solo/.claude-plugin/plugin.json` goes from 5.0.0 to 5.1.0.

## Steps

- ::S1:: Add `plugins/gh-solo/assets/GhSolo/IssueKeys.yml` (new) and `plugins/gh-solo/assets/GhSolo/IssueKeyRepeat.yml` (new), and reword the messages of `plugins/gh-solo/assets/GhSolo/PlanKeys.yml` and `plugins/gh-solo/assets/GhSolo/PlanKeyRepeat.yml` to fit a plan and a pull request body
- ::S2:: Keep `plugins/gh-solo/skills/pr-flow/scripts/plan-check.py` to the `GhSolo.Plan` rules with `--filter`, with a case in `plugins/gh-solo/skills/pr-flow/scripts/test-plan-check.sh` watched failing first
- ::S3:: Write `plugins/gh-solo/skills/pr-flow/scripts/keys-check.py` (new) and its bench `plugins/gh-solo/skills/pr-flow/scripts/test-keys-check.sh` (new), watching each refusal fail on a mutant first
- ::S4:: Run the script for the *Items are keyed* and *Keys are unique* rows of `plugins/gh-solo/skills/tracker/workflows/validate.md`, and add `Bash(python3:*)` to the grant and the Tools used lines of `plugins/gh-solo/skills/tracker/SKILL.md` and of that workflow
- ::S5:: Run the script on the pull request body in `plugins/gh-solo/skills/pr-flow/workflows/ready.md` and in Step 2 of `plugins/gh-solo/skills/pr-flow/workflows/merge.md`, refusing on a failure
- ::S6:: Name the script in the Tools used line and the Supporting files table of `plugins/gh-solo/skills/pr-flow/SKILL.md`, in the scripts table of `plugins/gh-solo/skills/pr-flow/README.md`, and in the Python and Vale requirements of `plugins/gh-solo/README.md`
- ::S7:: Add the bench's entry under *The plugin's benches* in `.agents/gh-solo.md`
- ::S8:: Move `version` in `plugins/gh-solo/.claude-plugin/plugin.json` to 5.1.0

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-07_GHI-420_check-the-keys-on-issues-and-pr-bodies.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V3:: `python3 scripts/version-check.py`
- ::V4:: `python3 scripts/manifest-check.py`
- ::V5:: `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- ::V6:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-plan-check.sh`, its new case watched failing with the `--filter` dropped from the plan check
- ::V7:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-keys-check.sh`, each refusal case watched failing on a mutant: the `IssueKeys` or `PlanKeys` map entry for its section deleted, the repeat rule's `seen` check removed, or the rule dropped from the script's filter
- ::V8:: `python3 plugins/gh-solo/skills/pr-flow/scripts/keys-check.py` on the bodies of #420 and of this branch's own pull request, each fetched into a scratch file

V1 names this plan alone. The repository's substitution would also hand it the plans of #369 and #267, which sit below this branch and carry no keys, a gap N3 accepts. The version check's range takes in the bumps below this branch, so only S8 holds this branch's bump. No gate can see whether each workflow's new sentence reads clearly where it sits.

## Open questions

None.

## Settled

- ::Q1:: Does the bench's entry in `.agents/gh-solo.md`, a repository-level file, land on this branch? Yes: the owner approved it before the plan was written, as #287 did for the criteria check's bench.
