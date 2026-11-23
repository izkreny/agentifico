> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Pin the tutor's sources to commits

Issue #398 holds the acceptance criteria. This plan says how.

## Approach

The day this package first adapted its sources is 2026-09-28, when #195 added the README's source list and rewrote the skill from them. The other candidate is 2026-03-27, when `skills/socratic-tutor/SKILL.md` was created, and it is ruled out: on that day three of the sources did not exist yet, and the other three resolve to the same commit as in September.

Each commit is the one N1's query returns with `until` set to #195's merge, 2026-09-28T13:12:25Z. The end of that day returns the same commits. Every file exists at its path in its commit.

| Source | Commit | Committed |
| --- | --- | --- |
| [mattpocock/skills, grilling](https://github.com/mattpocock/skills/blob/85f83d3fde1d3a90d5c9a657f6998c79a6c37308/skills/productivity/grilling/SKILL.md) | `85f83d3` | 2026-08-20 |
| [EveryInc/teach-skill, curriculum](https://github.com/EveryInc/teach-skill/blob/02ec4c8c2f49e5f490dcd300256fa443fda27b86/references/curriculum.md) | `02ec4c8` | 2026-08-07 |
| [the ChatGPT study mode gist](https://gist.github.com/idcesares/c28c7a7189726dc3d8a89b6db92c1c8d/82c66256579f12be38acf7086df5b1916141a1de) | `82c6625` | 2025-07-30 |
| [Sharan0516/socratic-tutor](https://github.com/Sharan0516/socratic-tutor/blob/0013716e69b468e439de6ed0d4fb6305d96178dd/SKILL.md) | `0013716` | 2026-04-21 |
| [github/awesome-copilot, mentoring-juniors](https://github.com/github/awesome-copilot/blob/306a2d30e62b3e419bb695677cdb4a9dc212e2b7/skills/mentoring-juniors/SKILL.md) | `306a2d3` | 2026-03-02 |
| [system_prompts_leaks, Gemini guided learning](https://github.com/asgeirtj/system_prompts_leaks/blob/573abf404fb51d56afa1526f13899c51b21b173e/Google/gemini-2.5-pro-guided-learning.md) | `573abf4` | 2025-10-14 |
| [system_prompts_leaks, Anthropic interviewer](https://github.com/asgeirtj/system_prompts_leaks/blob/b74fa3370fab695b36211e573d66a93250965579/Anthropic/anthropic-interviewer.md) | `b74fa33` | 2026-07-17 |

The gist has a single revision, addressed by its own commit in the URL. Only mattpocock/skills has moved since, and its pinned commit reached that repository's trunk on 2026-08-20, so `until` filtering on commit date misses nothing. The Paul & Elder PDF is not on a git host and stays as it is.

The README gains one sentence under its source heading, saying the links are pinned to the commit this skill was adapted from, so a later version can be compared against it. The heading, the install line and every description stay as they are.

## The source check

Between the adaptation-day pins and 2026-11-22, only mattpocock/skills changed its source, in two edits to grilling's SKILL.md, reaching [`7739eae`](https://github.com/mattpocock/skills/blob/7739eaed7f8f3915437a8def198a6d0d7206dbc7/skills/productivity/grilling/SKILL.md). Neither fits the tutor:

- "Word each question so yes accepts your recommended answer" contradicts the tutor's own rules, which forbid a yes-or-no question and a recommendation inside a question.
- "Dispatch a sub-agent with a fresh context window" tightens a step the tutor does not have: it looks facts up itself and dispatches no sub-agent.

So the skill's text is unchanged, and the grilling link moves to `7739eae`. The other links already name their newest commit.

## Steps

- ::S1:: Replace each `main` link in the source list of `skills/socratic-tutor/README.md` with its commit from the table, and the gist link with its revision
- ::S2:: Add the sentence saying the links are pinned, and why, under that list's heading
- ::S3:: Move `metadata.version` in `skills/socratic-tutor/SKILL.md` from `1.0.0` to `1.0.1`
- ::S4:: Read each source's changes since its adaptation-day commit, carry into `skills/socratic-tutor/SKILL.md` what fits, and name on the PR what does not and why
- ::S5:: Re-pin each link to the newest commit read, and reword the README's sentence to say the links name the commit last compared against

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-22_GHI-398_pin-the-tutors-sources.md`
- ::V2:: `node skills/agents-guru/scripts/check.js skills/socratic-tutor` exits zero with no `skill-pinned-sources` warning, after it was seen reporting seven on the branch's base `45d9bea`
- ::V3:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V4:: `python3 scripts/version-check.py`

No gate opens the pinned links, so whether each resolves to the file it credits rests on the table above, which was read from the GitHub API.

## Open questions

None.

## Settled

- ::Q1:: **Should the source check fold into this branch?** Yes, the owner said so in the terminal. Downloading the sources into the package was dropped, for the reasons N2 on the issue gives.
