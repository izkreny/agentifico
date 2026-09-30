> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Move misplaced text within skills-guru

Issue [#215](https://github.com/izkreny/agentifico/issues/215). It is not part of an epic, so the branch is cut from `main` and not stacked. Its blocker, #211, is closed.

## What changes

**One new file holds what only a maintainer reads.** `skills/skills-guru/references/maintaining.md` (new) opens with a heading and says to read it before editing `skills/skills-guru/assets/` or `skills/skills-guru/scripts/`. No route loads it. `skills/skills-guru/SKILL.md`'s supporting-files table names it and says the same.

**Text moves; it is not rewritten.** Where one sentence serves both readers, it is split. The reader's half keeps its wording, and the maintainer's half moves. A pointer inside moved text gains the file it points into, such as *The directive rule* in `skills/skills-guru/workflows/check.md`.

**The package moves 5.0.1 to 5.0.2.** Nothing an installer runs changes: no rule, no script and no route is edited.

## The audit

Each file a route loads was read for text that serves a maintainer. The table's paths are under `skills/skills-guru/`, and its line numbers are on `main` at 075de22.

| File and line | Text | Goes to |
| --- | --- | --- |
| `workflows/check.md:1` | the suite, and `gh` and `git` for growing a phrase list, in the tools line | the new file's opening |
| `workflows/check.md:5` | "which is what a rule you add has to be filed against", and registering a rule in `skills/skills-guru/scripts/lint-config.js` | the new file; the heading list stays |
| `workflows/check.md:41` | "the suite re-runs that evidence on demand" | the new file's suite section |
| `workflows/check.md:57` | the README rule mirrors the install list, and the suite fails on a form it does not accept | the new file |
| `workflows/check.md:63` | the path rules were derived from the gh-solo docs check | the new file; "no `--ignore`, so the span is reported" stays |
| `workflows/check.md:75` | why the name rule is a rule rather than a loop in prose | the new file; the charset sentence stays |
| `workflows/check.md:113` | why the prose rules sit in `skills/skills-guru/assets/`, and `StylesPath` | the new file |
| `workflows/check.md:115` | every token carries its source, and a later token does too | the new file; the first clause stays |
| `workflows/check.md:130` | no rule caps a section, by decision | the new file; its reader half joins *What a sweep still looks for by hand* |
| `workflows/check.md:132` | `## How a phrase list grows` | the new file |
| `workflows/check.md:168` | `## The suite` | the new file |
| `workflows/new.md:87` | this package's suite as the mechanical half of the rule | the new file's suite section |
| `SKILL.md:7` | `compatibility` says a phrase list grows "in the check" | drop "in the check" |

Read and kept: `skills/skills-guru/SKILL.md`'s tools line and `scripts/` row, which describe the whole package. In `skills/skills-guru/workflows/check.md`, the figure note on the bolded-run rule, the `exceptions` sentence under the directive rule, and the `*.yml` clause: each tells a reader what a result means. `skills/skills-guru/workflows/review.md`, `skills/skills-guru/workflows/export.md` and `skills/skills-guru/references/managing.md` have no findings.

## Decisions

**A workflow file gets no word cap on this branch.** The cap on a skill's main file exists because that file loads on every invocation, per *Let size decide whether to split* in `skills/skills-guru/workflows/new.md`. A workflow loads only on its route. A cap would also be a new authoring rule for every skill the check reads, which is new behaviour and a different issue. If one is wanted, it gets its own issue. This decision is posted on #215 with the audit.

## Steps

- Write `skills/skills-guru/references/maintaining.md` (new) from the moved text, with the pointers inside it fixed.
- Cut the moved text from `skills/skills-guru/workflows/check.md` and `skills/skills-guru/workflows/new.md`, splitting the mixed sentences, and add the section-cap line to the by-hand list.
- In `skills/skills-guru/SKILL.md`, add the new file's row, fix `compatibility`, and bump `metadata.version` to 5.0.2.
- Post the audit and the word-cap decision on #215.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`
- `npm --prefix skills/skills-guru test`
- `npm --prefix skills/skills-guru run lint`
- `node skills/skills-guru/scripts/check.js <package-dir>` exits zero for `skills/review-text`, `skills/skills-guru` and `skills/socratic-tutor`.
- `git diff --quiet origin/main -- skills/skills-guru/assets skills/skills-guru/scripts skills/skills-guru/.vale.ini` exits zero, so no rule changed.
- `git grep -n -e 'How a phrase list grows' -e '## The suite' -e 'vale.test.js' -- skills/skills-guru/workflows` exits 1.

The check on `plugins/gh-solo` still fails on the three errors #212 owns. No rule changes here, so its result is the same as on `main`. The gates cannot tell whether a moved sentence still means what it meant, or whether the audit missed one. That is the review's.

## Open questions

None.

## Settled

- **Does this branch wait for `plugins/gh-solo` to pass the skills-guru check?** No, the owner settled. Its errors predate this branch and #212 owns them, as on #211.
