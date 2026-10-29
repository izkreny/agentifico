> 🤖 Written by AI --- read/modified by izkreny! 🤓

# action-policy

How to write, review and test authorization built on the [Action Policy](https://actionpolicy.evilmartians.io) gem: policy classes and rules, the applying methods, scoping a relation by permission, failure reasons, and the three kinds of spec that prove an authorization layer works. It covers the mechanism only, never the model: which role may do what is a decision each application makes, and this skill has nothing to say about it.

It does not apply to a codebase on Pundit, CanCanCan or model predicate methods, where the API it documents does not exist.

## Why it exists

Action Policy denies by default, and a rule name that does not resolve is denied by the same path as a rule that considered the request and refused. So a typo in a rule name, an `authorize!` that was never added, or an `index` that forgot to scope all look correct from the outside and pass every spec that only asserts a refusal. The traps this skill names are the ones that fail silently in the direction that looks safe.

## Install

```bash
npx skills add izkreny/agentifico -g -y -s action-policy
```

That is the [skills CLI](https://skills.sh).

## Invocation

The skill auto-fires on authorization work; there is no argument to pass. `SKILL.md` loads on every invocation and routes to the reference files below.

## Reference map

| File | Domain |
|---|---|
| `references/rails.md` | controller and channel integration, the `verify_authorized` hooks, generators, config flags, rescuing the exception |
| `references/scoping.md` | `authorized_scope`, `relation_scope`, `params_filter`, named scopes, scope options, matchers |
| `references/testing.md` | policy specs and the RSpec DSL, authorization and scoping matchers, view specs, debugging a rule |
| `references/reasons.md` | failure reasons, detailed reasons, `result.all_details`, i18n messages |
| `references/caching.md` | memoization layers, the rule cache store, invalidation, instrumentation events |
| `assets/llms-full.txt` | the pinned upstream documentation bundle these were distilled from |
| `scripts/check-upstream.sh` | reports whether that bundle still matches upstream |

## Per-project overrides

Where a repository documents its own authorization model, that document decides what a rule should return and this skill decides how the rule is written. The `rails-style` skill defaults to model predicate methods and names Pundit and CanCanCan as gems to skip; a project that has committed to Action Policy records the deviation in its own `.agents/rails-style.md`, and `app/policies/` there is intended rather than a violation.

## Provenance

Distilled from the gem's own documentation bundle at `https://actionpolicy.evilmartians.io/llms-full.txt`, read in full. The prose is derived rather than copied, so every section names the upstream guide page it came from as `upstream: <page>`, and checking a claim against the source is one grep into the pinned bundle. A claim carrying no citation is the skill's own judgement; a claim that disagrees with its cited page is a defect in the skill.

Code examples are restyled rather than copied, and correctness is established by running them against the gem, never by their provenance; the claims they encode were last executed against `action_policy` 0.7.6. A verbatim example is not thereby correct: the skill's own `apply_scope` example once used the `:relation` scope type because upstream's example did, having registered that matcher by hand a section earlier, and in an application that registers no such matcher it raises `ActionPolicy::UnknownScopeType`.

That bundle is kept at `assets/llms-full.txt` as a pinned snapshot, so the source the prose was written from stays readable and comparable rather than being a URL whose content has since moved. It embeds every guide page inline, which is why one file covers the whole documentation: the `./behaviour.md` style links in its text are cross-references between its own sections, not pages to fetch separately.

The bundle is MIT-licensed, as documentation maintained under `docs/guide/` in the gem's own repository, and `assets/LICENSE-upstream.txt` carries the notice MIT requires a copy to travel with.

## Maintenance

```bash
scripts/check-upstream.sh
```

Re-fetches the bundle and compares it with the snapshot. It exits 0 when nothing changed, 1 when upstream differs (printing the diff) or when the bundle has started linking pages it no longer embeds, and 2 when it could not check at all: no `curl`, no snapshot, a fetch that failed, a response too short to be the bundle, or a bundle whose `url:` page markers have gone, which is upstream restructuring rather than upstream editing. That last case is what keeps "no change" distinct from "did not run".

Read the diff before refreshing the snapshot. Upstream changing is the moment a claim in this skill can quietly stop being true, and refreshing first destroys the evidence of what changed.

Do not pipe the run through `head` or a pager: the diff is long, the writer takes a `SIGPIPE`, and the exit code becomes 141 instead of the 1 or 0 that carries the answer.

## Deliberate choices

- The GraphQL integration and the Pundit migration guide are omitted. The first belongs to a separate gem, `action_policy-graphql`, and the second is a one-off procedure rather than something an agent needs loaded while writing code.
- `allowed-tools` is omitted from the frontmatter: the skill is reference material applied during ordinary coding, so it needs whatever tools the surrounding task already has.
- Caching and instrumentation share one reference file. Both answer "authorization is costing too much", and splitting them would put the measurement in a different file from the fix.
