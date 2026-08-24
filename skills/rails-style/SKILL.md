---
name: rails-style
metadata:
  version: "1.0.0"
description: |
  The house Rails style, distilled from 37signals practice (Campfire, Fizzy, DHH's reviews). Use for all Rails coding, refactoring, and code review so architecture, naming, and safety standards stay consistent; fires on work touching models, concerns, controllers, routing, REST, authorization, dependencies, naming, views, helpers, Hotwire, Turbo Streams, Stimulus, background jobs, migrations, security, multi-tenancy, and webhooks. Not for non-Rails Ruby (plain gems, scripts, Sinatra, Hanami), where its Rails-convention arguments do not apply.
---

# Rails Style

The default baseline for Rails work. Distilled from 37signals codebases (Campfire, Fizzy) and DHH's review patterns. Sandi Metz's OOD guidance applies wherever it does not conflict with this file (small single-purpose classes and methods, depend on things that change less often than you do, isolate and name what varies, duck types over type checks); conflicts resolve in this file's favour.

## Per-project overrides

Before applying this skill in a repository, read `.agents/rails-style.md` there if it exists. It records that project's deliberate deviations and committed-stack facts (a kept gem, a different authorization approach, front-end choices), and it wins on any conflict with this skill. Anything not listed there follows this skill's defaults. Never flag a recorded deviation as a violation.

## References

Paths in this skill are relative to the file they appear in, inside the skill's own install directory; the one exception is `.agents/rails-style.md` above, which is relative to the repository being worked on. Deep domains live in references, loaded when the task touches them:

- [references/hotwire.md](references/hotwire.md): Turbo Streams/Frames, Stimulus, ActionCable, morphing, broadcast patterns
- [references/jobs.md](references/jobs.md): Active Job design, idempotency, retries, recurring work
- [references/migrations.md](references/migrations.md): schema-change safety, backfills, staged rollouts, constraints
- [references/security-multitenancy.md](references/security-multitenancy.md): tenant boundaries, scoped lookups, auth hardening, SSRF, CSRF
- [references/webhooks.md](references/webhooks.md): outbound delivery pipelines, failure classification, inbound verification

## Core Defaults

- Prefer clear, explicit code over clever abstractions. Abstractions must earn their keep; if you can't point to 3+ variations that need it, inline it.
- Keep controllers thin and put domain behavior in models. No service objects, form objects, or decorators replacing straightforward model methods.
- Prefer Rails conventions and built-ins before adding gems.
- Model state and behavior with domain concepts, not ad-hoc flags.
- Scope tenant/user data through ownership boundaries.
- Favor database constraints for hard invariants; only validate in AR when you need user-facing error messages.
- Keep interfaces small; don't add public methods that aren't used anywhere.
- Prefer write-time computation over expensive read-time composition (counter caches, delegated types, precomputed roll-ups, `dependent: :delete_all` when no callbacks needed).
- Use `params.expect(...)` for strong params.
- Let it crash: bang methods (`create!`), handle exceptions at boundaries. Only use `!` when a non-bang counterpart exists.
- Fix root causes, not symptoms (e.g. `enqueue_after_transaction_commit` over retry logic for races).
- YAGNI over defensive design: no guard for a case with no direct use today, no speculative parameter, no hook for an unscheduled future.
- Ship tests in the same PR as behavior changes.

## Modeling Patterns

- **State as records, not booleans.** Instead of `closed: boolean`, create a `Closure` record with `creator` and timestamps. You get who/when for free, and scoping is trivial:

```ruby
has_one :closure, dependent: :destroy
scope :closed, -> { joins(:closure) }
scope :open, -> { where.missing(:closure) }
```

- **Slice large models into concerns** named for capability (`Closeable`, `Watchable`, `Assignable`), each self-contained (associations + scopes + methods), ~50-150 lines, cohesive. Prefer nested modules under the model's namespace (`Card::Closeable` in `app/models/card/closeable.rb`) for domain slices; reserve `app/models/concerns/` for genuinely cross-model behavior. Never extract concerns containing only private methods.
- **POROs live in `app/models/`**, not `app/services/`: presentation objects (`Event::Description`), complex operations (`SystemCommenter`), view-context bundles (`User::Filtering`). They're model-adjacent, not controller-adjacent.
- **Default values via lambdas:** `belongs_to :creator, class_name: "User", default: -> { Current.user }`; `belongs_to :account, default: -> { board.account }`.
- **Current attributes for request context** (`Current.user`, `Current.account`), with cascading setters (assigning `session` resolves `identity`, which resolves `user` for the account).
- **Callbacks for setup/cleanup, not business logic.** Keep callback counts low.
- **Rails shortcuts to reach for:** `normalizes` (data cleanup before validation), `store_accessor` (JSON columns), `delegated_type` (heterogeneous collections; lean on their scopes/factories instead of redefining associations), `generates_token_for` (expiring signed tokens), string enums via `enum :status, %w[drafted published].index_by(&:itself)`, `after_save_commit`, `touch: true` chains for cache invalidation, `delegate` (lazy-loads too).
- **Association extensions for bulk domain operations:** define `grant_to`/`revise` on the `has_many` proxy; use `insert_all` for bulk creates and `dependent: :delete_all` on join tables with no callbacks. `events.create` over `events << Event.new`.
- **Human-friendly URLs:** override `to_param` with a per-tenant `number` rather than exposing raw IDs/UUIDs.
- **Normalize at input, not at read:** special-case queries guarding bad data mean the data should have been normalized on the way in (`normalizes`).

## Naming

- Spend time on names; naming is design. `Closure` beats `CardClose`; `Mention` beats `UserReference`. Names must stand alone (`Notifier::EventNotifier`, not `Notifier::Event`).
- Positive names: `active` not `not_deleted`, `visible` not `not_hidden`.
- Semantic associations named for role: `belongs_to :creator, class_name: "User"` not `belongs_to :user`.
- Domain-driven over technical: `quota.depleted?` not `quota.over_limit?`.
- Business-focused scopes: `:active`, `:unassigned`, `:golden`; not SQL-ish `:without_pop`.
- Consistent domain language: don't mix `source`/`resource`/`container` for one concept.

## REST & Routing

- Everything is CRUD: turn verbs into nouns. Close → `resource :closure` (POST closes, DELETE reopens); publish → `resource :publication`. No custom member actions.
- Singular `resource` for one-per-parent state; `scope module:` to group nested controllers (`Cards::ClosuresController`); shallow nesting for deep hierarchies.
- Resource-scoping controller concerns (`CardScoped` sets `@card` via `Current.user.accessible_cards.find_by!(...)`) shared across nested controllers, including shared Turbo render helpers.
- `resolve "Comment"` for polymorphic URL generation to the parent with an anchor.
- Same controllers serve HTML/Turbo/JSON via `respond_to`; no separate API namespace. No `respond_to` block when templates exist for both formats, it's implied.
- In `redirect_to`/`link_to`/`button_to`, prefer explicit `*_path` helpers with full arguments (`group_event_path(@group, @event)`) over polymorphic object/array targets (`[@group, @event]`). Read `config/routes.rb` first to get helper names and argument order right; nested helpers take every parent in order.

## Ruby & View Style

- Method organization: list methods in order of invocation; readers follow top-to-bottom.
- Expanded conditionals over guard clauses; early return only at the very start of a non-trivial method. Avoid multiple exit points mid-method.
- Inline assignment in conditionals: `if credential = authenticate(...)`.
- One-line trivially composable chains, but don't play Ruby golf; don't save aggressively on lines.
- For 2-3 cases, `case` beats metaprogramming and `method_missing`; just write the methods.
- Tag helpers over string interpolation: `tag.meta name: "current-user-id", content: Current.user.id if Current.user`. No inline JS blobs; boil down to a helper + meta tag.
- Helpers take explicit arguments, never implicit instance variables. Helpers with feature envy (all logic, no markup) belong in the model.
- Very hesitant about base-class/core extensions; only when on the way to an upstream patch.
- Comments say why, not what.

## Authorization

- No Pundit/CanCanCan: simple predicate methods on models (`card.editable_by?(user)`, `user.can_administer_board?(board)`).
- Controllers check (`head :forbidden unless ...`), models define what the permission means.
- Declarative controller macros for auth posture: `allow_unauthenticated_access`, `ensure_can_administer`.

## Dependencies

Before adding a gem ask: can vanilla Rails do this? Is 50-150 lines in-repo simpler than a dependency? Commonly skipped by 37signals: Devise, Pundit, ViewComponent, Redis (Solid Queue/Cache/Cable use the DB), service objects, form objects, decorators, GraphQL, SPA frameworks. The skepticism applies to the next gem, not to a project's committed stack; the committed stack and its deliberate exceptions live in the project's `.agents/rails-style.md`.

## Review Priorities

1. Correctness and data safety.
2. Multi-tenant/security boundaries.
3. Maintainability and readability.
4. Performance hot spots.
5. Style and polish.

## Always Flag

- Unscoped record lookups in tenant-aware flows (`Comment.find(params[:id])`); scope through user/tenant.
- New dependencies without strong justification.
- In-memory filtering/sorting that belongs in SQL (and `.map(&:name)` where `.pluck(:name)` works). In-memory sorting of things that need pagination: compute a sort code at write time instead.
- Service objects replacing straightforward model methods.
- Non-RESTful custom actions when resource modeling is clearer.
- Boolean state columns where a record would capture who/when.
- Pages with forms using HTTP caching (`fresh_when`/etag); stale CSRF tokens cause 422s.
- String status checks (`status == "x"`) when predicate-style APIs are available (StringInquirer / string enums).
- `params.require(:x).permit(...)` → `params.expect(x: [...])`.
- `validates :x, uniqueness: true` without a backing unique index.
- Unescaped interpolation into `html_safe` strings; escape first: `"<b>#{h(input)}</b>".html_safe`.
- Metaprogramming for 2-3 cases.
- Private-only concerns and anemic extracted methods: inline them.
- Test code shaping production design (test-induced design damage): a public method or injected collaborator that exists only so a test can reach it, or an abstraction whose only caller is the test suite.
- Tests of framework behavior (asserting that `normalizes` normalizes tests the framework, not the app).
- CSS selectors in Stimulus controllers instead of targets; and ask: will this catch new elements added via web socket?
- Overly broad event listeners (every click in the app routed through one handler).
- Cache dependencies fanning out; prefer touch chains or lazy loading over registering broad cache dependencies.

## Review Output

- Start with the biggest issue; don't bury the lede.
- For each finding: issue, impact, concrete fix with file:line references. Whenever possible, write the exact replacement code.
- Be direct and practical; "This is over-engineered" is a complete sentence. State the principle behind the nit.
- Praise sparingly and briefly when something is genuinely well done.
- End with either `Ship it` or a short prioritized fix list.
