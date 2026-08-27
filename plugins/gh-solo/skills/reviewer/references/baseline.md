# The engineering baseline

What the reviewer reviews against **where the repository documents nothing**. This file is the floor, never the ceiling, and never the authority.

**A documented repository standard always wins.** Where the repository's own `AGENTS.md`, `CLAUDE.md` or `.agents/gh-solo.md` endorses something this file would flag, the standard wins and the finding is suppressed. That is not a tie-break; it is the point. A repository's conventions are decisions somebody made on purpose, and a general baseline that overrode them would report the repository's own style back to its author as a defect.

**Everything here is a judgement call.** Each entry is a labelled heuristic, so a finding written from this file says "possible Feature Envy" rather than asserting one. A documented-standard breach can be a hard violation; a baseline smell never is. Where the rules above conflict with anything below, they win.

**Skip anything tooling already enforces.** A linter, formatter, type checker or test suite reports the same thing for free, every time, and a review that spends the reader's attention on it has bought nothing.

## The rules about the change itself

These come before any smell, because they are about whether the diff should exist in this shape at all, and a clean implementation of the wrong change is still the wrong change.

- **Solve the stated problem.** A change that solves a different problem than the issue states is wrong even when the implementation is good. This is the `spec` axis's first question, and it outranks every entry below.
- **The diff contains only what the goal requires.** No unrelated refactors, no renames the goal did not ask for, no style-only edits to untouched lines. A file that did not need to be in the diff is a finding.
- **Build for the case in front of you.** An abstraction with one caller, a parameter no caller passes, a hook for a future nobody has scheduled: each is removable, and each is *Speculative Generality* below arriving early.
- **"It compiles" is not "it works."** Every change should name how it was verified, and a critical path should have a test. A diff whose `## Verification` section is empty or untouched is a finding on its own.

## The smells

All of them, from chapter 3 of Fowler's *Refactoring*, 2nd edition. The right-hand column is his own, copied from the *Smells* table on the book's inside back cover. His page citations are deliberately dropped: nothing that reads this file can open the book, and a page number pins the file to one edition's pagination while looking authoritative after it stops being true. The names locate each entry in any edition.

**That column is a test you apply, never text you write.** Ask whether one of the named refactorings would actually resolve the structure in front of you. If none would, you have matched a description and not found the smell, which is the difference between a real finding and a pattern that merely looks similar. Then write none of it: naming the defect is your job, and saying how to fix it is forbidden, per the rule in `../SKILL.md`. The cells hold catalogue names rather than instructions so there is nothing there shaped like advice.

| Smell | What it is | Common refactorings |
|---|---|---|
| **Mysterious Name** | A name that leaves the reader puzzling over what the code does. Failing to find a good one often signals a deeper design problem rather than a naming one | Change Function Declaration, Rename Variable, Rename Field |
| **Duplicated Code** | The same structure in more than one place, so every read has to check the copies for differences and every change has to find them all | Extract Function, Slide Statements, Pull Up Method |
| **Long Function** | Length is not the real measure: the smell is the semantic distance between what the function does and how it does it | Extract Function, Replace Temp with Query, Introduce Parameter Object, Preserve Whole Object, Replace Function with Command, Decompose Conditional, Replace Conditional with Polymorphism, Split Loop |
| **Long Parameter List** | Everything the function needs passed in, confusing in its own right, and often one parameter is obtainable from another | Replace Parameter with Query, Preserve Whole Object, Introduce Parameter Object, Remove Flag Argument, Combine Functions into Class |
| **Global Data** | Data that can be modified from anywhere, with no way to find out which code did it | Encapsulate Variable |
| **Mutable Data** | Data updated in one place while another part expected something else, failing rarely enough to be hard to spot | Encapsulate Variable, Split Variable, Slide Statements, Extract Function, Separate Query from Modifier, Remove Setting Method, Replace Derived Variable with Query, Combine Functions into Class, Combine Functions into Transform, Change Reference to Value |
| **Divergent Change** | One module changed for several unrelated reasons | Split Phase, Move Function, Extract Function, Extract Class |
| **Shotgun Surgery** | The opposite: one change forcing many small edits across many places, so an important one is easy to miss | Move Function, Move Field, Combine Functions into Class, Combine Functions into Transform, Split Phase, Inline Function, Inline Class |
| **Feature Envy** | A function spending more time with another module's data than with its own | Move Function, Extract Function |
| **Data Clumps** | The same few data items travelling together, as fields in classes and as parameters in signature after signature | Extract Class, Introduce Parameter Object, Preserve Whole Object |
| **Primitive Obsession** | A domain concept carried as a string, a number or a hash rather than as its own type, so its rules have nowhere to live | Replace Primitive with Object, Replace Type Code with Subclasses, Replace Conditional with Polymorphism, Extract Class, Introduce Parameter Object |
| **Repeated Switches** | The same conditional on the same type in several places, so a new case has to touch all of them | Replace Conditional with Polymorphism |
| **Loops** | A loop where a first-class pipeline operation would say what is being done to the collection | Replace Loop with Pipeline |
| **Lazy Element** | Structure that is not earning its keep: a function whose name says no more than its body, a class that is one simple function | Inline Function, Inline Class, Collapse Hierarchy |
| **Speculative Generality** | Hooks and special cases added for a need nobody has yet | Collapse Hierarchy, Inline Function, Inline Class, Change Function Declaration, Remove Dead Code |
| **Temporary Field** | A field set only in certain circumstances, so the object does not always need all of its fields and a reader cannot tell when it does | Extract Class, Move Function, Introduce Special Case |
| **Message Chains** | A client asking one object for another, then that one for another, coupling it to the shape of the whole navigation | Hide Delegate, Extract Function, Move Function |
| **Middle Man** | Delegation carried too far: a class where most of the methods only forward | Remove Middle Man, Inline Function, Replace Superclass with Delegate, Replace Subclass with Delegate |
| **Insider Trading** | Modules trading more between themselves than the design intends, quietly | Move Function, Move Field, Hide Delegate, Replace Subclass with Delegate, Replace Superclass with Delegate |
| **Large Class** | A class doing too much, usually showing as too many fields, with duplication not far behind | Extract Class, Extract Superclass, Replace Type Code with Subclasses |
| **Alternative Classes with Different Interfaces** | Classes that ought to be substitutable for one another, whose interfaces do not match | Change Function Declaration, Move Function, Extract Superclass |
| **Data Class** | Fields with getters and setters and nothing else, manipulated in far too much detail by other classes | Encapsulate Record, Remove Setting Method, Move Function, Extract Function, Split Phase |
| **Refused Bequest** | A subclass inheriting methods and data it does not want and does not use | Push Down Method, Push Down Field, Replace Subclass with Delegate, Replace Superclass with Delegate |
| **Comments** | **The comment is not the smell.** Fowler calls comments a sweet smell; what smells is a comment used as deodorant, explaining code that should have been made clear instead. Read it as a pointer to the code under it | Extract Function, Change Function Declaration, Introduce Assertion |

## Source and maintenance

The binding rules above, the idea of pairing each smell with the refactorings that resolve it, and the "skip anything tooling enforces" discipline are adapted from the `code-review` skill in mattpocock/skills, at skills/engineering/code-review/SKILL.md, which is MIT licensed:

> MIT License
>
> Copyright (c) 2026 Matt Pocock

**The smells themselves are Fowler's rather than borrowed.** That skill carries a selected twelve; this file carries chapter 3 entire, with the refactoring column taken from the book's own *Smells* table, so nothing here is a paraphrase of a paraphrase.

Two deliberate departures from the borrowed material. Its briefs cap each axis at 400 words, which this plugin drops: the reviewer emits a structured findings file with one anchored finding per defect, and a word cap on the whole axis pushes against exactly that. And it has no concept of a pull request, a line anchor or a severity, all of which the round here requires, so those are additions rather than adaptations.

**Keeping it current is a manual diff of that upstream file**, occasionally, pulling changes in by hand. There is no automatic route and none is wanted: what makes the text worth borrowing is that it is stable and considered, so a change there deserves reading rather than syncing.
