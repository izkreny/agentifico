> 🤖 Written by AI --- read/modified by izkreny! 🤓

# rails-style

The house Ruby on Rails style, distilled from 37signals practice: the Campfire and Fizzy codebases and DHH's code reviews. It sets the baseline an agent applies to Rails coding, refactoring, and code review, covering architecture, modeling, naming, REST and routing, authorization, view style, and dependency policy, with deep domains split into reference files loaded only when the task touches them.

## Invocation

The skill auto-fires on Rails work; there is no slash argument to pass. `SKILL.md` loads on every invocation and routes to the reference files below.

## Reference map

| File | Domain |
|---|---|
| `references/hotwire.md` | Turbo Streams/Frames, Stimulus, ActionCable, morphing, broadcast patterns |
| `references/jobs.md` | Active Job design, idempotency, retries, recurring work |
| `references/migrations.md` | schema-change safety, backfills, staged rollouts, constraints |
| `references/security-multitenancy.md` | tenant boundaries, scoped lookups, auth hardening, SSRF, CSRF |
| `references/webhooks.md` | outbound delivery pipelines, failure classification, inbound verification |

## Per-project overrides

A repository can deviate deliberately: it records its committed stack and exceptions in `.agents/rails-style.md` at its root, and that file wins over this skill on any conflict. The Per-project overrides section of `SKILL.md` is the authority on how the override is read and applied.

## Provenance

Distilled from [37signals-skills](https://github.com/marckohlbrugge/37signals-skills), an extraction of house style from Basecamp's [Campfire](https://github.com/basecamp/once-campfire) and [Fizzy](https://github.com/basecamp/fizzy) codebases, plus DHH's own review comments on Fizzy and a few Hotwire and accessibility patterns from [rails_ai_agents](https://github.com/ThibautBaissac/rails_ai_agents). It exists to fold those per-topic sources into one consistent baseline; its framework-API claims were verified against the Rails source and the codebases above.

## Deliberate choices

- `allowed-tools` is omitted from the frontmatter: the skill is reference material applied during ordinary coding, so it needs whatever tools the surrounding task already has.
- The YAGNI rule in `SKILL.md` deliberately restates a rule that also lives in the owner's global instructions file; the duplication is accepted, so reviews should not flag it.
