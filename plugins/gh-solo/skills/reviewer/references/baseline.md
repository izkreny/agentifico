# The engineering baseline

What the reviewer reviews against **where the repository documents nothing**. This file is the floor, never the ceiling, and never the authority.

**A documented repository standard always wins.** Where the repository's own `AGENTS.md`, `CLAUDE.md` or `.agents/github.md` endorses something this file would flag, the standard wins and the finding is suppressed. That is not a tie-break; it is the point. A repository's conventions are decisions somebody made on purpose, and a general baseline that overrode them would report the repository's own style back to its author as a defect.

**Everything here is a judgement call.** Each entry is a labelled heuristic, so a finding written from this file says "possible Feature Envy" rather than asserting one. A documented-standard breach can be a hard violation; a baseline smell never is. Where the two rules above conflict with anything below, they win.

**Skip anything tooling already enforces.** A linter, formatter, type checker or test suite reports the same thing for free, every time, and a review that spends the reader's attention on it has bought nothing.

## The four rules about the change itself

These come before any smell, because they are about whether the diff should exist in this shape at all, and a clean implementation of the wrong change is still the wrong change.

- **Solve the stated problem.** A change that solves a different problem than the issue states is wrong even when the implementation is good. This is the `spec` axis's first question, and it outranks every entry below.
- **The diff contains only what the goal requires.** No unrelated refactors, no renames the goal did not ask for, no style-only edits to untouched lines. A file that did not need to be in the diff is a finding.
- **Build for the case in front of you.** An abstraction with one caller, a parameter no caller passes, a hook for a future nobody has scheduled: each is removable, and each is *Speculative Generality* below arriving early.
- **"It compiles" is not "it works."** Every change should name how it was verified, and a critical path should have a test. A diff whose `## Verification` section is empty or untouched is a finding on its own.

## The smells

Twelve, from chapter 3 of Fowler's *Refactoring*. Each reads *what it is* → *how to fix*. Match them against the diff; name the one you mean and quote the hunk.

- **Mysterious Name** - a name that does not say what the thing is or does → rename it to the thing it actually is, and if no name fits, the thing is doing more than one job.
- **Duplicated Code** - the same structure in more than one place → extract it, or where the two copies are drifting on purpose, say which one is authoritative.
- **Feature Envy** - a function that reaches into another object's data more than its own → move the function to the data it envies.
- **Data Clumps** - the same few fields travelling together through signature after signature → make them one object, which usually then attracts behaviour.
- **Primitive Obsession** - a domain concept carried as a string, integer or hash → give it a type, so the rules about it have somewhere to live.
- **Repeated Switches** - the same conditional on the same type, in several places → replace it with polymorphism, so adding a case touches one site.
- **Shotgun Surgery** - one change forcing small edits across many files → gather what changes together into one place.
- **Divergent Change** - one module edited for unrelated reasons → split it along the reasons.
- **Speculative Generality** - machinery built for a need nobody has yet → delete it; the need will arrive with better information than a guess.
- **Message Chains** - a caller walking `a.b().c().d()` to reach what it wants → ask the first object for the result instead, so the caller stops depending on the shape of the middle.
- **Middle Man** - a class that mostly forwards to another → talk to the other one, and delete the pass-through.
- **Refused Bequest** - a subclass inheriting things it does not want and does not use → prefer delegation, or move the unwanted part down out of the parent.

## Source and maintenance

The two binding rules above, the *what it is* → *how to fix* form, the smell selection, and the "skip anything tooling enforces" discipline are adapted from the `code-review` skill in mattpocock/skills, at skills/engineering/code-review/SKILL.md, which is MIT licensed:

> MIT License
>
> Copyright (c) 2026 Matt Pocock

Two deliberate departures from it. Its briefs cap each axis at 400 words, which this plugin drops: the reviewer emits a structured findings file with one anchored finding per defect, and a word cap on the whole axis pushes against exactly that. And it has no concept of a pull request, a line anchor or a severity, all of which the round here requires, so those are additions rather than adaptations.

**Keeping it current is a manual diff of that upstream file**, occasionally, pulling changes in by hand. There is no automatic route and none is wanted: what makes the text worth borrowing is that it is stable and considered, so a change there deserves reading rather than syncing.
