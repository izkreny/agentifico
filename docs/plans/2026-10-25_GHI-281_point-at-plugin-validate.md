> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Point the sweep at `claude plugin validate`

Issue [#281](https://github.com/izkreny/agentifico/issues/281), a child of epic #226. It ports the agnix rows the #223 verdict gives the reason "validator", and CC-PL-002 and CC-PL-008, all as prose in `skills/skills-guru/workflows/review.md`.

## Where this branch sits

**It is cut from the tip of `feat/GHI-280_check-context-fork`, and its pull request targets that branch.** #281 is blocked by #280, and the issue's own `## Dependencies` says that is stack order rather than a need. That is the exception *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md` names. The trunk sitting ahead of this branch is normal for a stack and is not recovered here.

## What the sources say

- The [plugins reference](https://code.claude.com/docs/en/plugins-reference), fetched for this plan, under *Manifest file*: "Put every other plugin file at the plugin root, not inside `.claude-plugin/`." It also calls `claude plugin validate` "the authoritative check for a manifest".
- `claude plugin validate --strict plugins/gh-solo` on Claude Code 2.1.310 exits 0. Its plugin directory checks warn that no icon exists, and that warning leaves the exit code alone.
- That warning's fix text suggests `.claude-plugin/icon.png`, which the page never names. The page says Claude Code does not read `icon`, and its only example path is `./logo.png` at the plugin root. The rule follows the page the issue cites, and the clash is the review round's to argue with.

## The prose

**The paragraph in *A package root* that sends a sweep to the manifest, the agents and the hooks gains a sentence for Claude Code**, worded the way the `claude plugin eval` sentence is. It names `claude plugin validate --strict <plugin-dir>`, says a non-zero exit is a finding, and says what the run leaves to the check: an agent's name limits and a frontmatter field's value. It points at *The agent rule* and *The plugin file rules* in `skills/skills-guru/workflows/check.md` for the rest, rather than listing the rule's reports.

**One paragraph states that a plugin's `.claude-plugin/` holds its manifest alone**, citing the plugins reference. It says the validator passes a component placed there, so reading is what catches it. The subsection already opens four paragraphs in a row with a bolded lead, so the sentence above goes inside an existing paragraph and this one is the only new bolded lead.

**The tool lines name the command.** The `Tools used` line of `skills/skills-guru/workflows/review.md` and the one in `skills/skills-guru/SKILL.md` name `claude plugin validate`. It stays out of `allowed-tools`, since a pattern there cannot name a subcommand without granting every `claude` command, so the run prompts.

## Steps

- Plant defects in a scratch copy of `plugins/gh-solo` and run `claude plugin validate --strict` on each: an agent with no `description` and an unknown hook event must exit 1, and a skill folder inside `.claude-plugin/` must exit 0. Record the results on the PR.
- Add the Claude Code sentence to the manifest-and-hooks paragraph under *A package root* in `skills/skills-guru/workflows/review.md`.
- Add the `.claude-plugin/` paragraph to the same subsection.
- Name `claude plugin validate` in the `Tools used` lines of `skills/skills-guru/workflows/review.md` and `skills/skills-guru/SKILL.md`.
- Move skills-guru's version a minor, to 6.6.0.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `npm --prefix skills/skills-guru test`
- `npm --prefix skills/skills-guru run lint`
- `node skills/skills-guru/scripts/check.js skills/skills-guru`
- `node skills/skills-guru/scripts/check.js plugins/gh-solo`
- `node skills/skills-guru/scripts/check.js skills/review-text`
- `node skills/skills-guru/scripts/check.js skills/socratic-tutor`
- `python3 scripts/version-check.py`

No gate reads what the prose claims about the validator. The planted defects show it on 2.1.310 only, and a later release can change what `--strict` fails without failing anything here. Neither the validator nor the check reports a misspelt frontmatter field or an unknown model, and the prose does not claim either does.

## Open questions

None.
