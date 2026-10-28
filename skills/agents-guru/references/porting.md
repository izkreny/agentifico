# Porting a rule from another tool

Read this before taking a rule from another tool's catalogue into this package, such as a rule from [agnix](https://github.com/agent-sh/agnix). No route loads it. It decides whether a rule earns a place here and where the place is; `references/maintaining.md` then says how a check rule is registered.

## The tests, in order

A rule stops at the first test it fails, and its verdict names that test as its reason. A rule can pass a test in part, and then only that part goes on to the next test.

### Its source is a specification or a vendor page

A rule is a candidate when it cites the Agent Skills specification or a vendor's documentation. A rule whose only evidence is source code, or a community's practice, is skipped: code shows what one build of one tool does, and a practice shows what some authors do, where the format and its vendors' pages state what is promised.

The catalogue's own type label sorts the queue and never decides it. A rule typed as community research is still a candidate when a vendor page it cites states it, and one typed as vendor documentation is still skipped when no page it cites does.

### The page states what the rule checks

Every page the rule cites is fetched and read, never trusted from the catalogue. The page has to state the defect, or the behaviour that makes it one. A rule whose page is silent is skipped, and one the page supports in part ports only that part.

Quote the sentence the verdict rests on. A fetch that summarises a page is a second reader, and a skip that rests on what a page does not say is the claim a summary gets wrong most easily, so such a skip is checked against the page's own words before it stands.

### One package's files can decide it

The check reads one target. A defect that depends on everything a user has installed is skipped, since no target holds the other half: a budget summed over every installed skill or agent, or a name shared across install locations.

### It copies no list that a stale copy would turn against a correct file

A rule that copies a vendor's list of valid values, or of forbidden ones, is skipped. The vendor's list changes with its releases, and a stale copy then flags files that are correct.

A list that only narrows a warning can port, such as the events a field has no effect on: a stale copy of it misses a warning and flags nothing correct. The comment on such a list says which way it fails, as the comment on `NO_MATCHER` in `scripts/rules/plugin-files.js` does.

### Nothing here states it already

A rule this package already states is marked owned, and the verdict names the owner: a check rule, a sentence in `workflows/new.md` or `workflows/review.md`, or `claude plugin validate --strict`, which `workflows/review.md` has a sweep run on every plugin. A rule owned in part ports the rest.

Owned is confirmed, never inferred, per *A check that has never been seen to fail is not evidence* in `workflows/new.md`. Run the named check rule on the rule's bad example and watch it fire. For the validator, plant the defect in a copy of a plugin, beside an unchanged copy that passes, and read the exit code of each.

### A mechanical fact becomes a check rule, and a judgement becomes prose

A defect a script can decide from the file alone becomes a check rule under `scripts/rules/`. One that needs the author's intent, or that a script could only guess at from a list of English words, becomes a sentence: in `workflows/new.md` when the author makes the choice, in `workflows/review.md` when the sweep has to read for it.

## Never a reason to skip

**That no file here uses what the rule judges.** A mistake another project has already documented is a lesson learned, so guarding against it is not speculation.

## The answer

**Every rule gets one row**: its id, linked to the catalogue's page for it; a verdict of port as a check rule, port as prose, already owned, or skip; and a reason that restates the page rather than the catalogue's wording, naming the page re-read. A rule that ports names its destination file and the issue that builds it, and rules that port into the same file share an issue.

The rows form one table, in this shape:

```markdown
| Rule | What <tool> checks | Verdict | Why |
|---|---|---|---|
| [<rule-id>](<the catalogue's page for it>) | <the rule's own name> | <verdict> | <what the page says, restated, and where the port lands>. Page re-read: [<page name>](<page url>). |
```

**A second table opens the answer and defines its terms**, so a row reads without this file: what each verdict means, what the columns hold, and which validator ran, on which version, against what.

**A defect in the other tool, found on the way, is reported to its maintainers.** That covers a rule its own cited page contradicts and a check that fires on a correct file. Reproduce each on a minimal tree first, and check the tool's tracker for an existing report.
