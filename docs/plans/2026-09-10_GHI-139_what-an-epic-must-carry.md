> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Say what an epic here must carry

Closes #139.

## The problem

Every rule about an epic here is written for whoever cuts the release. `AGENTS.md` states under *How a package is released* that the children stack, that the top branch is the package's sweep and that one tag is cut on the last squash commit, and `.agents/gh-solo.md` states the sweep's finding rule and what an epic child's blocker means for the `open` stop. None of it addresses the person writing the epic, so each epic has re-derived the same facts privately and an epic that omits one is not wrong by any rule its reader can cite. The fix is one section addressed to the epic's author, pointing at the rules rather than copying them.

## The approach

Add a `## What an epic here must carry` section to `.agents/gh-solo.md`, placed between *The skill review is its own issue, not a branch's gate* and *An epic child's blocker is its stack parent, not a wait*. It points at both of those and belongs with the release material rather than beside the label table.

**Every rule that already has a home is pointed at, and the pointer names the section it reads.** The stack and the release train are *An epic's work is stacked, and the stack is the release train* in `AGENTS.md`; the sweep as the last child and its branch as the stack's top are *A package epic's last child is that package's sweep issue, and its branch is the stack's top branch* there; the tag's own act is *The tag is cut by hand, once that package's sweep issue is closed, and never as part of a branch's merge*; the `blocked-by` stop and the ban on clearing the relation are *An epic child's blocker is its stack parent, not a wait* in this same file.

**The sweep's finding rule is pointed at rather than written again, and that is what the criterion asking for it stated once means.** *The skill review is its own issue, not a branch's gate* in this file already states that every finding the reading stands behind is fixed on the sweep's own branch with nothing deferred and nothing declined, and already names *A hotfix runs the sweep too* in `AGENTS.md` as the one release that triages. A second copy in the epic section would be the drift that criterion exists to prevent, so the section says the rule holds for every sweep including an epic's, and points there for its terms.

**What the section owns, because nothing states it yet.** A child joining an epic after the sweep exists goes below the sweep, never after it, which follows from the last-child rule and has so far been stated inside individual epic bodies. What `blocked-by` means on an epic child: it carries the stack's order, and that order is usually serialisation on shared files rather than a logical dependency, which is why every child has had to disclaim it in prose. That a package-labelled child's acceptance criteria may not require editing a repository-level file without the owner's say, and that the child instead names the edit in its own notes and asks on the branch, or leaves the decision to a `repo`-labelled issue of its own. That the tag belongs to the epic's own `## Done when`, so no child carries it as a criterion. And that no child's criteria may turn on another child being merged, since `gh stack merge` lands the stack at once and no child merges before the top branch, the checkable relation being that the other children sit in that branch's ancestry.

**Nothing about how these rules were arrived at goes in the file.** The occurrences are on the issue, where a reader can follow them. A file read as instructions carries the rule rather than the occasion, and a sentence about an epic that once encoded a rule privately reads as a rule about the present.

**The section is addressed to the epic's author throughout**, which is what keeps it from becoming a second release procedure: it says what to write down and what a criterion may not say, never what to do at the tag.

## Steps

- Add the `## What an epic here must carry` section to `.agents/gh-solo.md`, between *The skill review is its own issue, not a branch's gate* and *An epic child's blocker is its stack parent, not a wait*.
- Check every italic pointer in the addition against the section titles that actually exist in `AGENTS.md` and in this file.
- Grep the addition for a rule either file already states, and for a count of adjacent content.
- Run the verification gates below.

## Verification

- The docs-check command `.agents/gh-solo.md` states, run unpiped with its exit code read.
- `python3 scripts/version-check.py`, which for a change confined to repository-level paths reports no package version moved.

What those gates cannot see is every claim the section makes about another section. `plugins/gh-solo/skills/pr-flow/scripts/docs-check.py` resolves backticked paths and closes fences, and neither script reads an italic section title, so a pointer at a heading that has been renamed passes both while pointing at nothing. That is what the second step is for, and whether anything added is a copy rather than a pointer is settled by the review round on this branch, which is where this issue's eighth acceptance criterion lands.

There is no CI in this repository, so this pull request's checks report nothing, which is the expected answer rather than a missing one. `scripts/manifest-check.py` is not a gate here, since the branch touches no manifest, and the skills-maker suite is not either, since it touches nothing under `skills/`.

## Open questions

None.
