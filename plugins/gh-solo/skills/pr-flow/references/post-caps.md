# Post caps

How long a post may be, what falls outside the cap, and what sits inside a capped post without counting toward it. Read this when composing anything that carries a `via` line: a comment, a Review, a thread reply.

**Every post carrying a `via` line is five sentences or bullets at most**, the disclaimer and the `via` line excluded. Count them; mechanical, not a judgement - the same form and the same number as the `## Plan overview` cap in `workflows/open.md` and the summary caps in the `tracker` standards.

**The domain is the `via` line itself**, rather than a list of surfaces, so it reaches a surface nobody has written yet, and it needs no list to be kept in step - the examples in the `via` bullet above are examples rather than the set. What falls outside it, and what falls inside a capped post without counting toward the five, are *Never capped* and *Never counted* in `references/post-caps.md`.

**Never restate what the reader is already looking at.** The companion to the count, and the half a count cannot carry: a fix plan does not re-argue the finding it hangs under, a round report does not re-list findings that are already threads on the pull request, and a closing reply does not paraphrase its own commit. Five sentences of restatement are still five sentences of nothing.

**Where the detail has to exist, it goes in the commit message**, which has a reader who wants it and lands it in `git log` rather than in a thread, and the post names where it went.

**Where the owner's global instructions file sets its own cap** on a post under their name, that file wins and this number is the floor beneath it - the same precedence the disclaimer bullet uses.

## Never capped

Outside the domain entirely, however long it runs:

- **The PR body**, for the same reason it carries no `via` line. It is capped anyway, by *Body caps* in `workflows/open.md`, because it becomes a commit message on `main` - a different cap for a different reason, and not this one.
- **The git commit message body**, which is where *Post caps* sends detail that has to exist, and has to be unbounded for that to be an escape at all. It carries the disclaimer and no `via` line, so the domain already excludes it; it is named because a reader following the escape would otherwise have to infer that the destination is unbounded.
- **Anything `scripts/post-review.py` composes** - a finding and a record Review are built from the reviewer's findings file rather than written here, and `../reviewer/references/baseline.md` drops an inherited word cap on a finding deliberately, for a reason that is sound there and does not extend to conversation.

## Never counted

Inside a post the cap does reach, none of this counts toward the five, because none of it is prose whose length the agent chose:

- a fenced code block, and a table;
- a record row - one line per item, where the length is set by how many items there are rather than by how much was written. The fix map's `RF{n}`-to-commit rows and a convention check's failure list are both this, so a seven-failure Review is not a breach;
- the owner's own words, quoted;
- a literal a gate reads, such as `RESOLVE AUTHORISED:`;
- text relayed verbatim from another producer, which is the reviewer's report and carries its own word cap in `../reviewer/SKILL.md`.

## The `via` forms in use

`via` `implement` implement, the implementation record; `via` `pr-flow` review, convention check; `via` `pr-flow` resolve, the authorisation; `via` `pr-flow` discuss, thread reply; `via` `implement` implement, divergence note. These are examples of the form rather than a closed set - the domain is any post carrying such a line, so a new one needs no edit here.

**The one exception is the PR body, which carries the disclaimer alone.** It is unmistakably itself, and the squash merge lands it in the commit on `main`, where a workflow tag would be noise.
