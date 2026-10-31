# Testing

upstream: testing.md

Authorization is one of the few places where full coverage of a class is proportionate: every rule is a decision someone will rely on, and an untested rule fails silently in the safe-looking direction.

Each of these needs proving on its own, and passing one says nothing about the others:

1. The rule answers correctly.
2. The action actually authorizes.
3. The action actually scopes.

## Setup

```ruby
require "action_policy/rspec"
require "action_policy/rspec/dsl"
```

The first adds the `be_authorized_to`, `have_authorized_scope` and `be_an_alias_of` matchers. The second adds the policy DSL, which is included only for examples tagged `type: :policy` or living in `<repo-root>/spec/policies`; elsewhere it takes `include ActionPolicy::RSpec::PolicyExampleGroup`.

This file gives the RSpec forms, because RSpec is what its claims were run on. A Minitest codebase includes `ActionPolicy::TestHelper` and proves that an action authorizes with `assert_authorized_to` and that it scopes with `assert_have_authorized_scope`. Both are in upstream's testing page, found as *Reading this skill against the source* in `SKILL.md` shows.

`rubocop-rspec` does not recognise the DSL's aliases on its own. Add to `<repo-root>/.rubocop.yml`:

```yaml
inherit_gem:
  action_policy: config/rubocop-rspec.yml
```

## Policy specs

A policy is a plain Ruby object and can be tested as one. `apply(:update?)` rather than `update?` is what a spec calls, for the reason `SKILL.md` gives under *The policy class*: testing the bare method tests something the application never executes.

```ruby
RSpec.describe PostPolicy, type: :policy do
  let(:user)    { build_stubbed(:user) }
  let(:record)  { build_stubbed(:post) }
  let(:context) { { user: user } }

  describe_rule :update? do
    failed "when the user is neither admin nor author"

    succeed "when the user is an admin" do
      before { user.admin = true }
    end

    succeed "when the user is the author" do
      let(:record) { build_stubbed(:post, user: user) }
    end
  end
end
```

`describe_rule` supplies the subject, and `succeed` and `failed` assert the direction, nesting so a context reads as the condition that changed the answer. `record` and `context` are the names the DSL requires, which is why a policy spec reaches for `let` where a house style otherwise prefers inline setup: the names are the gem's interface, not a choice. Focus and skip variants exist: `xdescribe_rule`, `fsucceed`.

A failure message carries the result and its reasons, and with the debug helpers installed it carries the annotated source of the rule, showing which term returned what.

**Assert the permitted case, always.** A rule proven only by its refusals is a rule that may not exist, for the reason `SKILL.md` gives under "Deny by default, and the price of it".

An alias is asserted rather than re-tested, since it resolves at authorization time and has no method of its own:

```ruby
describe "rule aliases" do
  subject(:policy) { described_class.new(record, **context) }

  it { expect(:edit?).to be_an_alias_of(policy, :update?) }
end
```

**Never `describe_rule` an alias.** `apply(:new?)` runs the pre-checks with `result.rule` still `:new?`, where `authorize!` resolves the alias first and they see `:create?`, so a pre-check that reads the rule's name answers one way in the spec and another in the request; observed on 0.7.7.

## Scope specs

Create the rows, name them deterministically, and assert the set that survives:

```ruby
RSpec.describe PostPolicy, type: :policy do
  it "excludes a draft from the default scope" do
    user = create(:user)
    kept = create(:post, name: "A")
    create(:post, name: "B", draft: true)

    scoped = described_class.new(nil, user: user)
      .apply_scope(Post.where(name: %w[ A B ]), type: :active_record_relation)

    expect(scoped).to contain_exactly(kept)
  end
end
```

Constraining the target to the rows the example created is what keeps the expectation exact; a scope spec over the whole table asserts a set that any other example can change.

A params filter is asserted the same way, with `type: :action_controller_params` and `.to_h` on the result.

## Request specs

These prove the act of authorizing, not the answer, and the answer's spec does not cover them: an action that never calls `authorize!` passes every policy spec in the suite.

```ruby
it { expect { patch post_path(post) }.to be_authorized_to(:update?, post).with(PostPolicy) }

it { expect { get posts_path }.to have_authorized_scope(:active_record_relation).with(PostPolicy) }
```

`.with(...)` is optional on `be_authorized_to` and inferred from the target; on `have_authorized_scope` both the type and the policy are required. Further modifiers: `with_context`, `as` for a named scope, `with_scope_options`, and `with_target` for extra expectations against the object that was scoped. Composed matchers work as arguments, so `an_instance_of(Post)` and `a_hash_including(user:)` are available.

## View specs

A view calling `allowed_to?` needs a `current_user` on the view spec's controller. Where `ActionController::Base` already answers one, as with Devise, an unstubbed spec raises `Missing policy authorization context: user`. Where only the application's own controllers define it, the call raises `NoMethodError`, and `verify_partial_doubles`, on in the rspec-rails generated config, refuses the stub too. Observed on 0.7.7 with rspec-rails 8.0.4. This stub works either way:

```ruby
before do
  without_partial_double_verification do
    allow(controller).to receive(:current_user).and_return(user)
  end
end
```

## Debugging a rule that answers wrongly

upstream: debugging.md

With `prism` and `method_source` available, `pp :feed?` on a policy instance prints the rule's expression tree annotated with what each term returned, which locates the failing predicate in a composed rule without bisecting it by hand.

```text
MyPolicy#feed?
↳ (admin? #=> false OR allowed_to?(:access_feed?) #=> true)
  AND (user.name == "Jack" #=> false OR user.name == "Kate" #=> true)
```

Breakpoints inside the rule are skipped rather than triggered during that evaluation; `ActionPolicy::PrettyPrint.ignore_expressions` takes a regexp for a debugger it does not already know.

## The per-thread cache in tests

upstream: caching.md

Per-thread policy caching is disabled when `RAILS_ENV` or `RACK_ENV` is `test`, so a spec sees each rule applied for real. A spec that asserts caching behaviour has to turn it on with `ActionPolicy::PerThreadCache.enabled = true` and turn it back off.
