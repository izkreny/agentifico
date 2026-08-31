> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Fix the highest-RF read that cannot run

Closes #44.

## What is broken, watched failing

Step 2 of `plugins/gh-solo/skills/pr-flow/workflows/review.md` reads the highest `RF{n}` on a pull request with `gh api --paginate --slurp … --jq …`. Run against PR #42 on `gh` 2.98.0 it prints `the --slurp option is not supported with --jq or --template` and exits 1, before any request is made. Every review round since `ae1cd1a` has therefore had no way to read the number `post-review.py build --continue-from` requires.

## The shape of the fix, and where it departs from the issue

**The issue's technical notes prescribe `gh api --paginate --slurp … > <scratch-file>` and a `python3` read of that file. This plan uses `gh api --paginate` without `--slurp` instead**, because `--paginate` writing to a file already merges every page into one flat array: `gh api --paginate "repos/{owner}/{repo}/pulls/42/comments?per_page=1" > f` was run during planning and produced a four-element array of comment objects, where the `--slurp` form produced a four-element array *of arrays*. The flat shape is the one Step 6 of the same workflow already writes and the one `post-review.py verify` already parses - its own refusal message names `gh api --paginate repos/{owner}/{repo}/pulls/<pr-number>/comments` as the required source. So the flat form costs one loader and one listing shape across the whole workflow, where `--slurp` costs a second of each.

**The number comes from a `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` subcommand rather than an inline `python3 -c`.** Both prefix-match the skill's grant, but only the subcommand can be held by `plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh`, and the script already owns `rf_id`, the definition of what an id looks like.

**Not in scope, deliberately:** having `build` read the listing itself and compute `--continue-from`. It would remove a step and an argument, and it is a different change from the one #44 states.

## Steps

- Add a `highest-id` subcommand to `plugins/gh-solo/skills/pr-flow/scripts/post-review.py`: `--comments <listing-file>`, printing the highest `RF{n}` across every body in a flat comments listing, or `0` when the listing carries none. It scans **all** matches per body with `re.findall(r"\bRF(\d+)\b", …)` rather than `rf_id`'s single `re.search`, since a thread reply can name several ids; the `\b` is what keeps `PERF123` from reading as `RF123`, and it is the boundary `rf_id` and `verify` already use.
- Turn `main()`'s two-way `build`/`verify` ternary into a three-way dispatch, and give the new subcommand the same `load_json` refusal on a listing that is not a JSON array.
- Add bench cases to `plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh`: an empty listing, a listing with no id at all, a single id, ids out of order, several ids in one body, `PERF123` not matching, and a listing that is a JSON object rather than an array. Each case is watched failing before it is trusted.
- Replace the command in `plugins/gh-solo/skills/pr-flow/workflows/review.md` Step 2 with the two-command form, and rewrite the paragraph beneath it: what it now says is that `--slurp` and `--jq` are refused together on `gh` 2.98.0 and later, that the per-page `--jq` form the pairing existed to avoid is still wrong for the reason it always was, and that the flat listing is the same read Step 6 makes.
- Grep the plugin tree for any surviving reference to the `--slurp` form, in `plugins/gh-solo/skills/pr-flow/workflows/review.md` and outside it.
- Move `plugins/gh-solo/.claude-plugin/plugin.json` from `3.0.0` to `3.0.1`. The marketplace entry declares no version, so nothing moves there.

## The audit `ae1cd1a` owes, done at plan time

Every command line `ae1cd1a` added to `plugins/gh-solo/`, and whether it has now been run:

| Site | Command | Result |
|---|---|---|
| `plugins/gh-solo/skills/pr-flow/workflows/review.md` | `gh api --paginate --slurp … --jq …` | **refused outright** - this issue |
| `plugins/gh-solo/skills/implement/workflows/fix.md` | `gh api --paginate … --jq '.[] \| select(.in_reply_to_id == null) \| …'` | runs; the filter is a per-item stream, so per-page application is harmless |
| `plugins/gh-solo/skills/tracker/workflows/validate.md` | `gh issue view … --json …,subIssues,…` | runs; `subIssues` is a valid field |
| `plugins/gh-solo/skills/pr-flow/workflows/review.md` | `post-review.py build …`, `post-review.py verify …` | run, and both held by `plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh` |
| four `README.md` files | `claude plugin marketplace add`, `claude plugin install` | the installed plugin this repository is served by is the evidence |

A second pass over the same diff for an **edited flag on a pre-existing** command found only the two sites above.

## Verification

- [ ] `bash plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh`
- [ ] The shipped two-command sequence, run against PR #42 with `?per_page=1` appended to force one page per comment, prints `1` - the true maximum across four pages, which the per-page `--jq` form prints as `1`, `0`, `1`, `1`
- [ ] The same sequence, run against this pull request before its first review round, prints `0`
- [ ] `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans --ignore '.claude/*' --ignore 'docs/plans*' --ignore '*GHI-50*'`, its exit code read rather than piped
- [ ] `python3 scripts/version-check.py`

What these gates cannot see: whether a real review round now reaches `build --continue-from` with the right number, since the sequence above is exercised against a merged pull request and a draft rather than inside a round. The first round on this branch is where that gets observed, and it is observed by the round succeeding rather than by any command here.

## Open questions

- The bullet in `plugins/gh-solo/skills/pr-flow/SKILL.md` that says "Where an extraction looks like it needs `grep`, `sort` or `tail`, `--jq` already does it in the one call" is the pressure that produced this defect, and #44's technical notes name that shape as worth more than the instance. Should it carry the `--slurp` incompatibility as a clause, or is that a separate issue?

## Settled

None yet.
