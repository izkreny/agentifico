# GitHub issue standards, solo developer

The rulebook this skill validates against and writes to. Per-repo overrides, where a repository wants a different label taxonomy or branch format, live in `.agents/gh-solo.md` in that repository.

Everything here assumes **one person owns the repo and does the work**. Where a team process would add a gate that somebody else clears, this one records a fact and moves on. Where it changes a rule outright rather than relaxing it, the section that does so says why: the priority axis under *Never label the default* drops its middle value because triage is absent.

---

The standards are three files, split because no workflow needs all of them at once and this one was read whole by workflows that needed a fraction:

| File                           | What it holds                                                               | Read it when                                          |
|--------------------------------|-----------------------------------------------------------------------------|-------------------------------------------------------|
| `references/issue-shape.md`    | hierarchy and sizing, titles, bodies, acceptance criteria, spikes           | writing or validating an issue's own text             |
| `references/tracker-fields.md` | labels and the mandatory axis, dependencies, milestones, state, issue types | setting or auditing anything GitHub stores as a field |
| `references/formats.md`        | branch names, commit subjects, pull request titles, plan filenames          | naming a branch, a commit or a pull request           |

This file is the index and holds no rules of its own, so a rule cited by section name lives in one of the three above.
