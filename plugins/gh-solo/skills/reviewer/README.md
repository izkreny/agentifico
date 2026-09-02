> 🤖 Written by AI --- read/modified by izkreny! 🤓

# reviewer

The thing that reads your diff and tells you what is wrong with it. A pull request number goes in, a findings file comes out, and nothing else happens: it does not write to the pull request, does not touch your working tree, and does not tell you how to fix anything.

## You do not run this

**A review round starts through `pr-flow`**, which spawns the `reviewer` agent, which loads this skill. That indirection is the whole point rather than ceremony.

The session that wrote your code cannot review it. It has already reasoned its way to why every line is shaped the way it is, and asked to judge that same code it will find its own reasoning persuasive, because it is the reasoning it just had. A separate agent starts with none of it and sees only the diff, the issue and your repository's standards.

So loading this skill in the session that just implemented something produces a review that agrees with itself. The skill opens with a refusal for exactly that case, and its description says so, but the reliable protection is simply starting rounds the normal way:

```
/gh-solo:pr-flow review <pr-number>
```

## What it looks for

**Two questions, kept apart on purpose.**

- **Standards** — does the diff follow the conventions your repository documents, and the engineering baseline where it documents none?
- **Spec** — does the diff implement what the issue asked for?

Those fail differently. Code can obey every convention while implementing the wrong thing, and it can do exactly what was asked while breaking every convention in the repo. Fold either into the other and one of them disappears. So they run as two reads and stay labelled, and nothing ranks them against each other.

**Scope creep is a first-class finding**, not a footnote. Behaviour in the diff that nobody asked for is behaviour nobody has judged, and it lands on your trunk under an issue that never mentions it.

**Your repository outranks the baseline, always.** It reads your `AGENTS.md` or `CLAUDE.md` and your `.agents/gh-solo.md` first, and where those endorse something the baseline would flag, the baseline loses. A general rulebook that overruled your own conventions would just be reporting your style back to you as a defect.

**Anything your tooling already catches is skipped.** A linter reports the same thing for free, every time, and a review spent on it has bought you nothing.

## What every finding carries

- **One defect.** Never two bundled together, because each one gets judged, fixed and resolved on its own and a bundled finding cannot be half-accepted.
- **A severity it assigns itself**, from `high`, `medium` and `low`, so nothing downstream has to translate one vocabulary into another.
- **A failure scenario**: concrete inputs or state, then the wrong result. This is what makes a finding checkable rather than an opinion, and a finding that cannot have one is dropped instead of guessed at.
- **An anchor** — the file, the line, and which side of the diff — so it lands as a thread on the code it is about rather than as a comment about the branch in general.

**No suggested fixes.** This is the rule that feels least helpful and is worth the most: whoever fixes the finding knows the code better than the reviewer does, and a suggested fix anchors them to the first thing the reviewer happened to think of. Naming the defect and its consequence is the job.

## The second pass

After fixes land, the round spawns it again with only the fix commits and the findings they claim to close. It answers two questions and no others: did this diff actually close that finding, judged against the finding's own failure scenario, and did any fix introduce something new.

That exists because the fixes were made by the author of the code under review, with nobody watching. A guard added on the wrong branch leaves every gate green and a thread asserting a closure that never happened.

## If you want a different reviewer

Your repository can appoint one, in `.agents/gh-solo.md`: another agent to spawn, or a capability to invoke instead. `pr-flow`'s review workflow owns what each must produce. Whatever reads the diff, the round is what posts the findings, so they arrive marked and numbered the same way.

## Layout

| Path                     | Holds                                                                                                          |
|--------------------------|----------------------------------------------------------------------------------------------------------------|
| `SKILL.md`               | what binds both passes: what a finding carries, the file it returns, the report, and the standing prohibitions |
| `workflows/full.md`      | the full pass: what it reads, and the two axes it judges on                                                    |
| `workflows/rescope.md`   | the scoped re-review: the little it reads, its two questions, and the verdicts it adds                         |
| `references/baseline.md` | the engineering baseline for a repository that documents nothing, and where it came from                       |

## Install

This skill ships inside the `gh-solo` plugin and is not installed on its own:

```bash
claude plugin marketplace add izkreny/agentifico
claude plugin install gh-solo@agentifico
```

The plugin's own `README.md` has the local-checkout variant, the requirements, and what else installing it brings.
