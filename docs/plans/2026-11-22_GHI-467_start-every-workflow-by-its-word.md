> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Start every workflow only by its word

Issue #467 holds the acceptance criteria. This plan says how.

## Approach

**The rule has one home: *Routing* in `plugins/gh-solo/skills/pr-flow/SKILL.md`.** A workflow starts only when the owner's own message names its word or that word's shortcut. A sentence that names neither starts nothing. Where it asks for what a workflow does, the reply prints that workflow's word or shortcut, as `:mr 60 (merge)`, and stops. `tracker` and `implement` load without `pr-flow`, so each skill file carries the local rule in one sentence and points at that section.

**The rule keys on the word the owner typed, never on what `$ARGUMENTS` holds.** N1 lets a description load a skill from a sentence, and the model then writes the argument itself, so "merge it" could arrive as `merge 60`. An argument the agent composed from a sentence is not the owner's word. A workflow that another enters by name is started by the word that started the chain, as `auto` enters `implement`.

**Two kinds of miss, two replies.** An unmatched slash-command argument still prints the skill's help page and names the argument, and now adds the nearest word. A sentence in the conversation prints only the nearest word, so ordinary talk never dumps the help page.

**What is not an entrance stays as it is.** Reactions, thread replies, "OK" naming a finding, `explain`, the scope words after `fix`, a confirmed `create` table, and `approve`, `:ap` and `discard` at a standing refusal are signals inside a running workflow. Frontmatter descriptions stay, per N1, and `setup` stays, per N4.

**Every entrance is a word, and three change shape.** `unwatch` and `:uwt` lose their any-words clause, so the issue's every-workflow rule wins over today's "a stop misread costs nothing". `tracker` gains `create <description>` in place of the bare-description route, and a named `#50` no longer reaches `status`. `implement` routes a PR number, or nothing, to its implementation and `fix` to its fix entrance. Anything else gets the nearest word.

**The release marks.** Sentences that started workflows stop starting them, which breaks how an installer drives the plugin. So the commit and the PR title carry `feat(gh-solo)!:`. The version moves by the patch only, 5.2.12 to 5.2.13, as a stacked branch does.

## Steps

- ::S1:: `plugins/gh-solo/skills/pr-flow/SKILL.md`: state the rule in *Routing*, make the table's first column words and shortcuts only, cut every any-words clause, the not-literal-command-only sentence, the `approve` exclusion and the bare-word sentence from the resolve bullets, and cut the sentence routes: a branch's relationship, the rest of implementing, and an issue. Make the fallthrough print the nearest word, read the owner's word rather than the conversation context, and match the help page's row in *Supporting files*
- ::S2:: `plugins/gh-solo/skills/pr-flow/references/pass-cap.md`: delete the paragraph that guards `approve` and `:ap` against the resolve entrance's any-words match
- ::S3:: Under `plugins/gh-solo/skills/pr-flow/`, these name the word and never a sentence: *The entrance* in `plugins/gh-solo/skills/pr-flow/workflows/resolve.md`, `plugins/gh-solo/skills/pr-flow/workflows/watch.md`, `plugins/gh-solo/skills/pr-flow/workflows/discuss.md`, `plugins/gh-solo/skills/pr-flow/workflows/merge.md`, the printed blocks in `plugins/gh-solo/skills/pr-flow/workflows/auto.md` and `plugins/gh-solo/skills/pr-flow/workflows/review.md`, and step 7 in `plugins/gh-solo/skills/pr-flow/references/review-protocol.md`
- ::S4:: `plugins/gh-solo/skills/pr-flow/workflows/help.md`: add rows for `approve`, `:ap` and `discard` to the padded table, drop every sentence that starts a workflow, and say once that a sentence starts nothing
- ::S5:: `implement`: narrow the routing in `plugins/gh-solo/skills/implement/SKILL.md` and add its rule sentence. In `plugins/gh-solo/skills/implement/README.md`, list its words and fix the text and diagram that name a sentence. Do the same in `plugins/gh-solo/skills/implement/workflows/fix.md`
- ::S6:: `tracker`: in `plugins/gh-solo/skills/tracker/SKILL.md`, delete *Auto-triggers* and the paragraph handing phrases to `pr-flow`, route `create`, add the rule sentence, read the owner's word, and fix `argument-hint`. In `plugins/gh-solo/skills/tracker/workflows/help.md`, change the `create` row, drop the bare-invocation line and *Auto-triggers*, and say a sentence starts nothing. Delete the auto-trigger gate in `plugins/gh-solo/skills/tracker/workflows/state.md`, name `next` in the heading of `plugins/gh-solo/skills/tracker/workflows/search.md`, and fix the diagram node in `plugins/gh-solo/skills/tracker/README.md`
- ::S7:: `plugins/gh-solo/README.md` and `plugins/gh-solo/skills/pr-flow/README.md`: rewrite *How each skill is reached* so every workflow starts only by its word, and fix every line and diagram node that names a sentence
- ::S8:: Move `version` in `plugins/gh-solo/.claude-plugin/plugin.json` from 5.2.12 to 5.2.13

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-22_GHI-467_start-every-workflow-by-its-word.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V3:: `python3 scripts/version-check.py`
- ::V4:: `python3 scripts/manifest-check.py`
- ::V5:: `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- ::V6:: `! (grep -rnE 'resolve all and push|we are done|you can merge|I replied on the PR|stop watching|in any words|Auto-triggers|auto-trigger|trigger phrases|bare description' plugins/gh-solo | grep -vE '/SKILL\.md:4:')` exits 0, so no file outside a frontmatter description names a phrase entrance. It was watched failing on the branch's base, 182e62f, where it matched 37 lines.
- ::V7:: `mmdc -p <puppeteer-config> -i <readme> -o <scratch-dir>/out.md` exits 0 for each of `plugins/gh-solo/skills/pr-flow/README.md`, `plugins/gh-solo/skills/implement/README.md` and `plugins/gh-solo/skills/tracker/README.md`

V6 catches only the phrases it names. A new phrase entrance in other words passes it, so a reviewer reads each routing section against AC1. No gate decides which owner signals are entrances and which run inside a workflow. That line is the list in *Approach*.

## Open questions

None.

## Settled

None yet.
