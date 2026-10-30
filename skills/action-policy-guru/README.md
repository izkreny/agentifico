> 🤖 Written by AI --- read/modified by izkreny! 🤓

# action-policy-guru

How to write, review and test authorization built on the [Action Policy](https://actionpolicy.evilmartians.io) gem: policy classes and rules, the applying methods, scoping a relation by permission, failure reasons, and the kinds of spec that prove an authorization layer works. It covers the mechanism only, never the model: which role may do what is a decision each application makes, and this skill has nothing to say about it.

It does not apply to a codebase on Pundit, CanCanCan or model predicate methods, where the API it documents does not exist.

## Why it exists

Action Policy denies by default, and a rule name that does not resolve is denied by the same path as a rule that considered the request and refused. So a typo in a rule name, an `authorize!` that was never added, or an `index` that forgot to scope all look correct from the outside and pass every spec that only asserts a refusal. The traps this skill names are the ones that fail silently in the direction that looks safe.

## Install

```bash
npx skills add izkreny/agentifico -g -y -s action-policy-guru
```

That is the [skills CLI](https://skills.sh).

## Invocation

The skill auto-fires on authorization work; there is no argument to pass. `SKILL.md` loads on every invocation and routes to the files under `references/`.

## Reference map

`SKILL.md` lists the files under `references/` and what each covers, under *References*. Beside them:

| File | Domain |
| --- | --- |
| `assets/llms-full.txt` | the pinned upstream documentation bundle the references were distilled from |
| `scripts/check-upstream.sh` | reports whether that bundle still matches upstream |
| `scripts/test-check-upstream.sh` | the offline bench for that script, run after any edit to it |

## Provenance

Distilled from the gem's own documentation bundle at `https://actionpolicy.evilmartians.io/llms-full.txt`, read in full. Every section cites the upstream page it came from, under the contract `SKILL.md` states in *Reading this skill against the source*.

Code examples are restyled rather than copied, and correctness is established by running them against the gem, never by their provenance; the claims they encode were run against `action_policy` 0.7.7, both in plain Ruby and inside a Rails 8.1 application with RSpec. A verbatim example is not thereby correct: an example can depend on setup its page made earlier, such as a scope matcher registered by hand, and copied into an application without that setup it raises.

That bundle is kept at `assets/llms-full.txt` as a pinned snapshot, so the source the prose was written from stays readable and comparable rather than being a URL whose content has since moved. It embeds every guide page inline, which is why one file covers the whole documentation: the relative links to other guide pages in its text are cross-references between its own sections, not pages to fetch separately.

The bundle is MIT-licensed, as documentation maintained in the gem's own [repository](https://github.com/palkan/action_policy), and `assets/LICENSE-upstream.txt` carries the notice MIT requires a copy to travel with.

## Maintenance

```bash
<skill-dir>/scripts/check-upstream.sh
```

Re-fetches the bundle and compares it with the snapshot. Its exit code says whether upstream still matches the snapshot, differs from it or links a page it does not embed, or could not be checked. The script's header comment owns which code means which, and the code owns the cases behind each.

Read the diff before refreshing the snapshot. Upstream changing is the moment a claim in this skill can quietly stop being true, and refreshing first destroys the evidence of what changed.

Do not pipe the run through `head` or a pager: the diff is long, the script dies of `SIGPIPE`, and without `pipefail` the pipeline reports `head`'s `0`, so a changed bundle reads as unchanged.

## Deliberate choices

- The GraphQL integration and the Pundit migration guide are omitted. The first belongs to a separate gem, `action_policy-graphql`, and the second is a one-off procedure rather than something an agent needs loaded while writing code.
- `allowed-tools` is omitted from the frontmatter: the skill is reference material applied during ordinary coding, so it needs whatever tools the surrounding task already has.
- Caching and instrumentation share one reference file. Both answer "authorization is costing too much", and splitting them would put the measurement in a different file from the fix.
