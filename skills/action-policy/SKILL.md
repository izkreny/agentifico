---
name: action-policy
metadata:
  version: "1.0.0"
description: |
  How to write, review and test Action Policy authorization in a Ruby or Rails codebase: policy classes under app/policies, rules and default-deny, authorize!, allowed_to?, allowance_to, check?, allow! and deny!, pre-checks, rule aliases, authorization context, policy lookup, authorized_scope and scoping, verify_authorized hooks, failure reasons and their details, i18n messages, policy caching, and policy, request and scope specs. Use whenever a task touches a policy class, an authorization rule, a scope that filters records by permission, an ActionPolicy exception, or a spec that proves who may do what. Not for choosing an authorization library, and not for a codebase on Pundit, CanCanCan or model predicate methods, where this API does not exist; where a project documents its own authorization model, that document stays the authority on which answer is correct and this skill only covers how to express it.
---

# Action Policy

Action Policy answers one question, *how to verify access*, and deliberately answers no other. It ships no roles, no permissions and no model of who a user is, so every capability question in a codebase is that codebase's own; this skill covers the mechanism that expresses the answer.

Paths inside this skill are relative to the skill's own directory.

## Reading this skill against the source

Every section names the upstream guide page it was distilled from, as `upstream: <page>`. Those pages are embedded in [assets/llms-full.txt](assets/llms-full.txt), so checking any claim here against the source is `grep -n "url: /guide/<page>" assets/llms-full.txt` and reading forward. The prose is derived rather than copied: read it as a claim with a citation, not as upstream's own words.

A claim without a citation is this skill's own judgement rather than upstream's, and a claim that disagrees with the cited page is a defect in this skill. Code examples are restyled from upstream's, so an example never carries upstream's exact text either.

The snapshot is a pinned copy, and `scripts/check-upstream.sh` is what says whether it still matches the live docs.

## The project's model wins

Where a repository documents who may do what, that document decides what a rule should return, and this skill decides how the rule is written. Read it before changing a rule or the spec that proves one, and treat a disagreement between it and the code as a defect in one of them rather than as licence to pick either.

`rails-style` defaults to model predicate methods and names Pundit and CanCanCan as gems to skip. That default is overridden per project, in the file `rails-style` reads for deviations, and a project that records its commitment to Action Policy there has made that call: `<repo-root>/app/policies/` there is intended rather than a violation.

## References

Loaded when the task touches them, since each costs context on every load:

- [references/rails.md](references/rails.md): controller and channel integration, the `verify_authorized` hooks, generators, config flags, rescuing the exception
- [references/scoping.md](references/scoping.md): `authorized_scope`, `relation_scope`, `params_filter`, named scopes, scope options, matchers
- [references/testing.md](references/testing.md): policy specs and the RSpec DSL, authorization and scoping matchers, view specs, debugging a rule that answers wrongly
- [references/reasons.md](references/reasons.md): failure reasons, detailed reasons, `result.all_details`, i18n messages
- [references/caching.md](references/caching.md): memoization layers, the rule cache store, invalidation, instrumentation events

For a question those files leave unanswered, grep [assets/llms-full.txt](assets/llms-full.txt) for the page, as *Reading this skill against the source* shows, rather than loading the whole bundle.

## The policy class

upstream: writing_policies.md

One policy per resource, named for the singular resource with a `Policy` suffix, in `<repo-root>/app/policies/`, with rules named as the predicate form of the controller action they authorize.

```ruby
class PostPolicy < ApplicationPolicy
  def show?   = record.published?
  def update? = user.admin? || record.user_id == user.id
end
```

`record` is the target being authorized and `user` is the authorization context. Both are readers on the policy, so a rule is an ordinary predicate method and needs no framework knowledge to read.

**Rules must be public, because a private one is denied rather than refused loudly.** On `ActionPolicy::Base` a private `update?` is not a rule at all: it falls to the default rule and returns `false`, the same path as a typo, so only the permitted-case spec under *Deny by default, and the price of it* catches it. It raises only under `default_rule nil`, as `ActionPolicy::UnknownRule`, or as a `NoMethodError` when an alias reaches it; observed on 0.7.7, where upstream says a private rule always raises (upstream: aliases.md).

**Never instantiate a policy in application code.** `authorize!` and `allowed_to?` add pre-checks, caching and reason tracking that `PostPolicy.new(post, user:).update?` skips silently, so a hand-built policy answers a different question from the one the request asks. A spec is the exception, and it calls `apply(:update?)` rather than the rule method for the same reason.

## Deny by default, and the price of it

upstream: custom_policy.md, aliases.md

`ActionPolicy::Base` sets `default_rule :manage?` and defines `manage?` as `false`, so a rule the policy does not define resolves to `manage?` and is denied. An empty policy denies everything without a line of code.

**A mistyped rule name is therefore a denial, not an error.** `update?` misspelled resolves to `manage?` and returns `false`, which looks exactly like a considered refusal. Only a spec that asserts the *permitted* case catches it, which is why a rule proven solely by its denials is not proven. This is the trap [references/testing.md](references/testing.md) is written around.

`allowed_to?(:new, post)` with the question mark missing hits the same path. Set `ActionPolicy.enforce_predicate_rules_naming = true` to make that shape raise instead, since a rule name without a question mark is always a typo.

## Applying a policy

upstream: behaviour.md, writing_policies.md

- `authorize! post, to: :update?` raises `ActionPolicy::Unauthorized` on failure. The exception carries `policy`, `rule` and `result`, and `result` is where the reasons live.
- `allowed_to?(:edit?, post)` returns true or false, and is what a view asks before rendering a link.
- `allowance_to(:edit?, post)` returns the result object instead, for an API response that must say *why* rather than just *no*.
- `authorized_scope(Post.all)` filters a relation through the policy; see [references/scoping.md](references/scoping.md).

Inside a policy, a rule composes other rules with `allowed_to?`, passing a record for another policy's rule and omitting it for a rule on this one. `check?` wraps `allowed_to?` and takes the same arguments; it exists for readability, and reads better when the rule being composed lives on this policy. Prefer either over calling the predicate directly: only the wrapped call records a failure reason, so a rule composed with bare Ruby calls fails with no explanation of which part refused.

`allow!` and `deny!` end a rule early, and `deny!(:no_user)` names the reason while doing it.

```ruby
class PostPolicy < ApplicationPolicy
  def show?
    allow! if user.admin?

    check?(:publicly_visible?)
  end
end
```

## Authorization context

upstream: authorization_context.md

The context is everything a rule needs besides the record, and it is declared in two places that must agree: the policy says what it requires, the calling layer says where each value comes from.

```ruby
class ApplicationPolicy < ActionPolicy::Base
  authorize :account
end

class ApplicationController < ActionController::Base
  authorize :account, through: :current_account
end
```

A missing or `nil` context value raises `ActionPolicy::AuthorizationContextMissing`. `allow_nil: true` permits a `nil` value with the key still required; `optional: true` permits the key to be absent.

**Every policy that can be reached from another must share a context.** A nested `allowed_to?` passes the *calling* policy's context to the nested one, so a policy requiring a key its caller does not have raises at the moment the composition runs rather than when it was written. Keeping the whole tree on one context set is what prevents that; a parent whose context is a superset of its children's also holds.

## Pre-checks

upstream: pre_checks.md

A predicate repeated at the top of most rules belongs in a pre-check, which runs before the rule and can end authorization outright.

```ruby
class PostPolicy < ApplicationPolicy
  pre_check :allow_admins

  def show? = record.published?

  private
    def allow_admins
      allow! if user.super_admin?
    end
end
```

A pre-check halts only by returning the value of `allow!` or `deny!`; any other return value is ignored and the rule runs. They take `only:` and `except:` like callbacks, and `skip_pre_check` removes an inherited one for named rules. Pre-checks come from `ActionPolicy::Base`, or from including `ActionPolicy::Policy::PreCheck` into a base policy written from scratch.

## Aliases and the default rule

upstream: aliases.md

`alias_rule :edit?, :destroy?, to: :update?` resolves at authorization time rather than defining a method, which keeps the alias out of the specs: the rule is tested once and the alias is asserted to point at it. `ActionPolicy::Base` ships `alias_rule :new?, to: :create?`.

Resolution order for a rule on a subclass: a concrete method on the subclass, then a matching alias, then a concrete method up the ancestry, then the default rule. The alias step is the one worth reading twice, because it covers inherited aliases too: a subclass with no concrete `destroy?` of its own still resolves `destroy?` through an alias its *superclass* declared, ahead of any concrete superclass method. A subclass alias of the same name overwrites the inherited one rather than adding to it. That resolution order, overwrite included, was observed on 0.7.7.

**Within one class, declaration order decides between a method and an alias of the same name.** Defining a method deletes an alias already declared under its name, but an `alias_rule` declared after the method wins, so an alias line added below an existing concrete rule silently replaces it; observed on 0.7.7.

`default_rule nil` turns an unmatched rule into `ActionPolicy::UnknownRule` instead of a denial, which trades the safe direction for a loud one.

`index?` and `create?` are defined as `false` on `ActionPolicy::Base` and `new?` aliases to `create?`, so the default rule never sees them; routing them through it as well takes `alias_rule :index?, :create?, :new?, to: :manage?`.

## Identifiers

upstream: writing_policies.md

`CommentPolicy.identifier` is `:comment`, and a namespaced policy's is `:"admin/comment"`. The identifier is the key failure reasons are reported under and the scope i18n messages are looked up in, so renaming a policy moves both; `self.identifier = :short_name` pins it when the class name is unwieldy.

## Policy lookup

upstream: lookup_chain.md, namespaces.md

Lookup infers `PostPolicy` from a `Post`, and takes these overrides in order of how much they say: `with: CustomPostPolicy` names the class outright, `namespace: Admin` prefers `Admin::PostPolicy` and falls back, `strict_namespace: true` removes the fallback, and `default: GuestPolicy` catches a record with no policy at all. Without any of them a record with no policy raises `ActionPolicy::NotFound`.

Prefer letting inference work. An explicit `with:` in a controller is a claim that this action authorizes against a different policy than the record's own, which is worth reading and therefore worth being rare.
