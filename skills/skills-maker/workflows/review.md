> **Tools used:** `Read` to load the skill, `Grep` to cross-check against other skills, `Bash(node:*)` and, where present, `Bash(ruby:*)` for the frontmatter checks run via `workflows/check.md`.

Review an existing skill. Find what is wrong and name the specific defect; agreement is not the output being asked for.

## Step 1 - Read the whole target

Read every file in the skill's directory, whatever the layout: `SKILL.md`, what it routes to under `workflows/` and `references/`, what it runs from `scripts/`, the `README.md` written for humans, and any directory the author added beyond the conventions, since the spec allows arbitrary files and a defect does not care which folder it sits in. A defect in a routing skill is usually a contradiction between two files rather than a flaw in one, and it is invisible if only one was read; a script disagreeing with the doc that invokes it is the same defect in executable form.

**The path may be a package root rather than one skill.** A plugin's skills sit at `<root>/skills/`, and a whole-package sweep is what a release tag asserts, so `review` takes the root and reads what is under it. `workflows/check.md` states the argument shapes; the scope rules below are this file's own.

**Everything under the root is in scope, not only the files under its skills.** A package's manifest, its agents, its hooks and its own `README.md` belong to no skill, and nothing else ever reads them whole: a branch review reads a diff, so a file no branch has touched since it was written is read by nobody. That residue is exactly where a sweep earns its cost.

**Reachability is by walking the tree, never by following references out of the skills.** Following references is the plausible design and it misses the files that matter most: a plugin's agent definition is spawned by name at runtime and cited by path in no skill under it, so a reference-following scope skips the agent every review round runs.

**Report which files were read.** Without it, a run that covered part of a package and a run that covered all of it produce the same shape of output, and the tag's whole claim is that nothing was missed.

## Step 2 - Run the mechanical check

Follow `workflows/check.md` first. It catches the silent failures cheaply, and there is no point reviewing prose in a skill whose triggers are being discarded.

## Step 3 - The defects that actually occur

First hold the skill against every rule in `workflows/new.md`: whatever authoring requires, review enforces, and its absence in an existing skill is a defect. That file is the authority, so a rule added there is picked up here without this file changing. The entries below are the field notes on top: how violations actually manifest, and what no authoring rule anticipated.

**Triggers that only exist in the body.** Every phrase meant to fire the skill must be in `description:`. Grep the body for "use this when" and similar, and confirm each has a counterpart in the frontmatter.

**A premise that is no longer true.** Skills accumulate assumptions stated as fact: "there is no planning", "every issue gets X", "this repo always Y". Check each against what the user actually does now. One false premise usually appears in four or five places, so when you find one, grep for its restatements rather than fixing only the sentence you were shown.

**Duplication with a global instructions file.** Anything stated in both the user's global instructions file (AGENTS.md, CLAUDE.md or equivalent) and a skill will drift. Decide which owns it, and if the skill wins, confirm the trigger survives in the description.

**Version banners.** A "verified against X" line at the top of a file ages into a false claim. Either attach the version to the specific behavioural claim it qualifies, or drop it.

**Enumerations that end in "and anything else".** The list was doing no work. Cut it to the rule.

**A count of adjacent content, or a position claim.** "The two facts below" is true until the third lands, and whoever adds it edits the list, never the sentence, because the sentence is invisible at the moment of the edit. Same class: "the only copy", "the newest section", "the paragraph above", each silently falsified by an edit made anywhere in the document. Caps stay ("five sentences at most" constrains the future); counts go (the list is the authority on its own length).

**Advertised verbs that route nowhere.** Check `argument-hint` against the routing table. An argument the skill accepts but does not handle is a promise it breaks.

**Rationale that restates the rule.** "Never do X. Doing X is bad." The second sentence should say what breaks, or go. Over-writing clusters where the author was least sure, so a section that reads as an essay is also the section to check for a defect underneath it.

**A missing boundary.** If the skill never says what it is not for, it will fire on adjacent work. That is the cheapest sentence in the file.

**A triggering doubt reading cannot settle.** Whether a description actually fires on its phrases is behaviour, not text. When that is the question, stop reading and measure with whatever eval tooling the agent in use provides, and read the scored report instead of guessing from the wording. On Claude Code specifically: `claude plugin eval <skill>` is built into its CLI and adds a no-plugin baseline arm, and Anthropic's official skill-creator plugin, when installed, carries a heavier eval loop with graders.

## Step 4 - Report

Rank findings by consequence, not by reading order. For each: the file and line, the specific defect, and what it costs when it bites. Propose the fix; apply it only when asked.

Separate what is wrong from what is merely different. A skill written in a style you would not choose is not defective, and expectations tier to the skill's size: a single-file skill needs no `workflows/` or `references/`, and the absence of structure it does not need is not a finding.

## Step 5 - Re-verify fixes with the same reviewer

When the review ran in a subagent and its findings were then fixed, resume that same agent to judge the fixes rather than starting a fresh review. The resumed agent keeps its full audit context, every file it read and what each finding actually meant, so re-verification is cheaper and sharper than a second audit, and it judges the fixes against what it originally meant rather than re-deriving the findings.

Keep the agent's id from the run that produced the findings. After the fixes are committed, send it the fix commit and ask for: a per-finding verdict (CLOSED / NOT CLOSED / REGRESSED), its judgement on any fix that resolved a finding by a different design than it proposed, confirmation or refutation of any finding that was set aside as phantom, and a short regression pass over the changed files. Have it list the file set first and read in full any file that did not exist at review time: new files are the resumed context's one blind spot, and fixes routinely add them. Report-only, no edits. If the harness cannot resume the agent, fall back to a fresh review pointed at the fix commit.
