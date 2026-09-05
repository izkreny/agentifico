> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Make the sweep a structural part of a package epic

Closes #97. `AGENTS.md` says the stack's top branch is the package's whole-package sweep and that a tag needs a closed sweep issue, but nothing says the sweep issue is a child of the epic, so an epic can close with every child merged and the sweep never opened. The rule survives today only as a `## Done when` box each epic remembers to type, which #78 and #95 have both done privately. This branch moves it into `AGENTS.md`, where it can be cited.

Independent of every open branch: two files change, both repository-level.

## Where the rule attaches

**Next to *An epic's work is stacked, and the stack is the release train***, which is where the stack's top branch is defined and the first of the two paragraphs a reader reaches. That paragraph already says the top branch is the sweep; what it does not say is which issue that branch belongs to, so the new sentence completes a claim already being made rather than starting one elsewhere.

***A package is tagged only after its own whole-package sweep has run* needs nothing new.** Its subject is what a tag asserts and what the sweep covers per package kind, and the epic case is about where the sweep issue sits, not about what it does.

## The reason has to be in the rule

The epic is what closes, so a sweep issue outside it is a precondition nothing enforces: the epic's progress counter never counts it, and the tag then stands on a package nobody read whole. Written without that sentence, the rule reads as a filing convention and the next epic drops it for the same reason the current ones had to remember it by hand.

## One package per epic, stated as the assumption it is

Every child of #26, #78 and #95 carries a single package label, so the rule is written for one package per epic and says so, rather than inventing an obligation for a shape this repository has never had. An epic spanning two packages would owe a sweep child and a top branch for each, and one stack cannot be topped by two branches - so such an epic is the moment to write that rule, not before.

## `.agents/gh-solo.md` points, it does not restate

*The skill review is its own issue, not a branch's gate* already says the sweep is its own issue, one per package, and must have run before the tag. The epic case gets one sentence there naming `AGENTS.md`'s heading as its owner, per *When a fact must appear twice, one copy owns it and every other copy says so* - a second copy of the rule is the drift this issue exists to end.

## No epic body is edited

#78 and #95 keep their `## Done when` boxes and their hand-made sweep children. The rule governs the next epic; rewriting two open epics to match a rule they already follow buys nothing and touches issues whose branches are in flight.

## Steps

- Add the rule to `AGENTS.md` under *How a package is released*, immediately after *An epic's work is stacked, and the stack is the release train*: a package epic's last child is that package's sweep issue, and its branch is the stack's top branch.
- Carry the reason in the same paragraph: the epic is what closes, so a sweep issue outside it is a precondition nothing enforces.
- State that the rule assumes one package per epic, which is what this repository has, and what an epic spanning two would owe.
- Give *The skill review is its own issue, not a branch's gate* in `.agents/gh-solo.md` one sentence pointing at `AGENTS.md` for the epic case.

## Verification

- The docs-check command `.agents/gh-solo.md` states, run unpiped with its exit code read.
- `python3 scripts/version-check.py`, which passes without exercising anything because no package's files change - the correct answer for a repository-level branch rather than a reason to leave the box out.

**Neither gate reads prose.** They see that backticked paths resolve, that fences close and that no package moved a version it owed. Whether the new paragraph reads as a rule rather than a note, and whether the pointer in `.agents/gh-solo.md` is short enough to stay a pointer, is the owner's judgement. The real test arrives with the next epic: it either carries a sweep child because the rule is citable, or it does not.

`python3 scripts/manifest-check.py` is not owed here: no manifest changes.

## Open questions

- None.

## Settled

- None yet.
