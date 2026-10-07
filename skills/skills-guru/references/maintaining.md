# Maintaining this package

Read this before editing anything under `assets/` or `scripts/`. No route loads it, because an agent checking, writing, reviewing or exporting a skill never needs it. Growing a phrase list also needs `gh` and `git`, to read findings and fix commits.

## Registering a rule

A rule you add is filed against the heading its findings group under, which `workflows/check.md` names. Register a new rule in `scripts/lint-config.js`, in the array for the heading it belongs under; Vale needs no registration.

## Where the prose rules live

**`assets/` is where the Agent Skills specification puts them**, as the data files it names lookup tables and schemas alongside. They are machine-read definitions rather than prose a reader loads or code the check runs, so `references/` and `scripts/` are both the wrong home. `StylesPath` points at that directory itself rather than one inside it, because Vale requires the path to hold the style's own subdirectory.

Each token in a phrase rule is named in the rule file by the finding or commit that removed it, so a token with no source is not there. A token added later carries its own source the same way, which is what keeps the list evidence rather than taste.

## Why some rules take the shape they do

### `skill-readme`

The rule mirrors the install forms `workflows/new.md` lists under *How it is installed* in its patterns, so a form added there is added to the rule in the same change, and the suite reads the list and fails on any form the rule does not accept.

### `skill-referenced-paths`

The span predicate and the resolution bases were derived from `<repo-root>/plugins/gh-solo/skills/pr-flow/scripts/docs-check.py`, and `scripts/rules/paths.js` marks each place it departs from that script on purpose.

### `skill-name`

It is a rule rather than a loop written out in `workflows/check.md` because shell written as prose carries quoting, word-splitting and glob hazards that nothing runs and nothing tests: a pipe swallows an exit code, an empty capture runs the body once on nothing, an unquoted expansion splits a name on its spaces and matches its brackets against the working directory. A rule gets the suite, where each of those is a fixture.

### No section cap

**No rule caps a section, by decision rather than by omission.** Vale can measure one, with a `metric` scoped to `doc(section:has(> h2))`, and a published style for instruction files caps such a section at 300 words. The selector nests, so an h2 section is measured with every h3 section inside it, and on this package the sections it would name are the ones already split into subsections, which is the shape a section takes when it is given headings rather than cut. A rule file here is the mechanical half of a rule `workflows/new.md` states, and that file states no section cap, so a sweep reads for one instead, per *What a sweep still looks for by hand* in `workflows/check.md`.

## How a phrase list grows

A phrase rule's tokens are evidence, per *Where the prose rules live*, and the records they were mined from keep growing with every merged pull request. Growing a list is a query over those records and a judgement on each phrase they return, run from the repository that owns the rules.

**A package's sweep re-mines the lists as its last act**, after its review round's fixes are pushed and just before merge. It reads everything merged since that package's last `<name>_<version>` tag, or the whole trunk history where the package has none.

### The sources

**A finding is a review comment carrying `::RF{n}::`**, which is how a `pr-flow` review round posts one, and a finding on prose is one whose `path` names a markdown file. Read the pull requests merged since the last run, then the review comments on each. `gh pr list` cuts its output at `--limit` without saying so, so the count it returns is read against that figure, and the figure is raised when the count reaches it:

```bash
gh pr list --state merged --limit 200 --search "merged:>=<date>" --json number --jq '.[].number'
gh api repos/{owner}/{repo}/pulls/<pr-number>/comments --paginate --jq '.[] | select(.path | endswith(".md")) | select(.body | test("::RF[0-9]+::")) | "\(.path):\(.line)\n\(.body)\n"'
```

**A fix commit's diff carries the phrase removed and the phrase written in its place**, which is a token and its guards line at once. Read every prose commit from a tag or a date onward; the fix commits are the ones whose body cites a finding, and the range between two runs is short enough to read whole:

```bash
git log --patch <tag>..origin/main -- '*.md'
git log --patch --since=<date> origin/main -- '*.md'
```

**The sweep's own records are read beside the merged range**: its own issue's findings, its own pull request's review threads and its branch's fix commits. No merged range ever holds them. The sweep's pull request is unmerged while the sweep runs, and the tag on its squash commit starts the next range after it. The review-comment query reads the open pull request as it reads a merged one. The issue's findings carry the sweep's own ids rather than `::RF{n}::`, so they are read from the issue, and the branch's commits are their own range:

```bash
gh issue view <issue-number> --json body,comments
git log --patch origin/main..<branch> -- '*.md'
```

### Which rule a phrase belongs to

**A phrase belongs to the rule whose `workflows/new.md` heading catches it**, and each rule's `message` opens on that heading. A count of adjacent content, where adding one more item makes the sentence false, is `Counts`. A claim an edit anywhere in the document can falsify is `Position`. A sentence anchored to a moment rather than a reason is `History`. A version or date claim in a file's opening region is `Banner`; the length rules hold no phrases.

**A phrase that belongs to none is reported, with its source, and gets no rule.** A rule whose message names no heading enforces nothing this skill states, and a rule enters `workflows/new.md` before it enters `assets/`.

### How a token lands

**A token lands in the rule file under `assets/Agentifico/`, under a comment naming the finding or commit it came from**, in the form the file uses. A token with no source is not there, per *Where the prose rules live*.

**It gets a line of its own in that rule's trip case, one only it trips, and that line's alert joins the case's `want`.** The trip case is the `tests:` case in the rule file named `fires on each recorded shape, once per line`. The suite's per-token coverage proves a token fires somewhere on that case's input, and where several tokens share a line, a token can pass on a neighbour's line. A line only it trips is what fails the trip case when the token is removed, and that removal is how the line is watched failing before it is trusted, per *A check that has never been seen to fail is not evidence* in `workflows/new.md`.

**Where the phrase has a legitimate use, that use goes in the rule's guards case beside the trip case**, as a line the rule must leave alone. A case in a rule file loads that rule alone, without `TokenIgnores`, so a line that is legitimate only because it is quoted goes in `scripts/test/vale.test.yml` instead. A guards line is what stops a later edit to the token from widening it past the record. A finding the owner refused in its thread is the same evidence read the other way: the phrase it named goes into the rule's `exceptions` where a token already matches it, or into the guards case where none does, with the thread as its reason.

**A word class a token spells out is held to that class's one list, in `assets/word-classes.yml`.** Vale has no variables, so each token repeats its class inline. The suite reads every `(?:...)` group made only of one class's words, and fails when the group is not that class's whole list. A narrower group passes only when the token's source comment carries `Narrows <class>: <reason>`. The source comment is the comment directly before the token, and a token sharing a comment with the token before it carries a marker of its own. A group holding any word from no class is held to no list.

A token widens past its recorded phrasing only where the widening is quite obvious, and only with the owner's approval. A token is evidence, per *Where the prose rules live*, so a wider list is a claim no review made. The approval is recorded in a thread on the pull request that widens the token. The token's comment then cites that pull request in place of its `Narrows` line.

**Then the check runs over this skill, and every place the token fires is fixed or excepted.** A true finding is fixed in the prose. A phrase that is right where it stands goes into the rule's `exceptions` with the reason beside it, never into a directive, per *The directive rule* in `workflows/check.md`.

## The suite

After editing a rule or the check itself, run the suite. Each markdownlint rule's fixtures are strings passed through markdownlint's own string input, and each Vale rule's are `tests:` cases in the rule file, which `vale test` lints as strings. A fixture that needs a file name is written to a temporary directory the suite creates and removes, so a fixture written as a `SKILL.md` sits outside any tree an agent discovers, where some agents would read it recursively as a broken skill.

Every Vale rule has a case that trips it and a case of the forms it must leave alone. The suite runs `vale test --coverage`, which fails on any rule no case reaches, since a Vale rule that matches nothing fails silently. The argument shapes the wrapper test names run against the check in a temporary directory that the suite creates and removes:

```bash
npm --prefix <skill-dir> test
```

Every assertion in it is held to *A check that has never been seen to fail is not evidence* in `workflows/new.md`, which owns that rule and its reason. Its mechanical half is `vale test --coverage` and the per-token loop in `scripts/test/vale.test.js`, and both reach the Vale rules alone. Even there they prove a case exists rather than that the case was ever red, so whether a failure was watched is a judgement no exit code supplies.

The description rules' fixtures are the evidence that every trap they test is one a real YAML parser exhibits, and the suite re-runs that evidence on demand.

The suite reads the scripts as code and never as style, so a rule edit owes the lint beside it, which neither the suite nor the check invokes:

```bash
npm --prefix <skill-dir> run lint
```
