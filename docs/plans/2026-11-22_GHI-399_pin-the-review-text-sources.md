> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Pin the review-text sources to commits

Issue #399 holds the acceptance criteria. This plan says how.

## Approach

Every source in the README's inspiration list arrived in one commit, `45e8bc6` from #197, merged at 2026-09-29T07:45:15Z. That is the day this package first adapted them. The skill created on 2026-03-28 names none of them.

Each commit is the one N1's query returns with `until` set to that merge. The end of 2026-09-28 and the end of 2026-09-29 return the same commits. Every file exists at its path in its commit.

| Source | Commit | Committed |
| --- | --- | --- |
| [EveryInc/compound-writing, cw-line-edit](https://github.com/EveryInc/compound-writing/blob/18702f0ece9f2b852e305807e0271b2d550d9b4b/skills/cw-line-edit/SKILL.md) | `18702f0` | 2026-08-27 |
| [agkozak/llm-prompts](https://github.com/agkozak/llm-prompts/tree/1e6dd4ee3a0fac309cf21a5e2383bebf8cd8eaed) | `1e6dd4e` | 2026-02-24 |
| [blader/humanizer](https://github.com/blader/humanizer/blob/d4b81278e6604e237bf32f0f7ce5c217aee94269/SKILL.md) | `d4b8127` | 2026-09-28 |
| [EveryInc/compound-writing, cw-voice-check](https://github.com/EveryInc/compound-writing/blob/18702f0ece9f2b852e305807e0271b2d550d9b4b/skills/cw-voice-check/SKILL.md) | `18702f0` | 2026-08-27 |
| [mattpocock/skills, writing-for-agents](https://github.com/mattpocock/skills/blob/321658273cb1d20b76026717d027d505790106d4/skills/productivity/writing-for-agents/SKILL.md) | `3216582` | 2026-08-19 |

agkozak/llm-prompts is linked as a whole repository, so its pin is the repository's newest commit on that day, as a `tree` link. The Elastic docs page and the proselint paper are not on a git host, and the agents-guru link is inside this repository, so those three stay as they are.

The README gains one sentence under its `## Inspiration` heading, saying the links are pinned to the commit this skill was adapted from, so later upstream changes can be read as a diff. The heading and every description stay as they are.

## Steps

- ::S1:: Replace each git-host link in the inspiration list of `skills/review-text/README.md` with its commit from the table
- ::S2:: Add the sentence saying the links are pinned, and why, under that list's heading
- ::S3:: Move `metadata.version` in `skills/review-text/SKILL.md` from `1.0.2` to `1.0.3`

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-22_GHI-399_pin-the-review-text-sources.md`
- ::V2:: `node skills/agents-guru/scripts/check.js skills/review-text` exits zero with no `skill-pinned-sources` warning, after it was seen reporting five on the branch's base `a9676af`
- ::V3:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V4:: `python3 scripts/version-check.py`

No gate opens the pinned links, so whether each resolves to the file it credits rests on the table above, which was read from the GitHub API.

## Open questions

None.
