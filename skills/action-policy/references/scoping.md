# Scoping

upstream: scoping.md

Scoping is a policy filtering a collection, where a rule authorizes one record. It is what an `index` needs: a rule can only say yes or no about a record already fetched, and fetching every row to reject most of them is both a leak and a full table scan.

## Defining a scope

```ruby
class PostPolicy < ApplicationPolicy
  relation_scope { |relation| user.admin? ? relation : relation.where(user: user) }

  relation_scope(:own) do |relation|
    next relation.none if user.guest?

    relation.where(user: user)
  end
end
```

`relation_scope` is `scope_for :active_record_relation`, and `params_filter` is `scope_for :action_controller_params`. The block is evaluated in the policy, so `user` and the rest of the context are in scope; the second argument names the scope, defaulting to `:default`.

Scopes have types because different targets need different filtering, and a type is matched by a *scope matcher*. Rails registers matchers for Active Record relations and Action Controller parameters, so a type rarely needs stating.

Blocks become instance methods, so subclasses inherit them and `super(relation)` chains them. `super` with implicit arguments does not work here, because the methods are defined with `define_method`.

```ruby
class ApplicationPolicy < ActionPolicy::Base
  relation_scope { |relation| relation.where(account_id: account.id) }
end

class PostPolicy < ApplicationPolicy
  relation_scope { |relation| super(relation).published }
end
```

## Applying a scope

```ruby
@posts = authorized_scope(Post.all)
@own   = authorized_scope(Post.all, as: :own)
@all   = authorized_scope(Post.all, scope_options: { with_deleted: true })
```

**The target must already be a relation.** `authorized_scope(Post)` raises, because `Post` is a class and no relation matcher accepts it; `Post.all` is the form that works. This is the mistake that gets made once per codebase.

`authorized` is an alias, and reads better on parameters than on a relation:

```ruby
@user = User.create!(authorized(params.require(:user)))
```

A scope can be applied inside a policy with the same `authorized_scope`, which is how one policy's scope composes another's:

```ruby
relation_scope(:edit) do |relation|
  relation.joins(:teachers).where(teacher_id: authorized_scope(Teacher.all, as: :edit))
end
```

Outside a class with the behaviour mixed in, `apply_scope` applies one explicitly, and the type has to be named:

```ruby
PostPolicy.new(nil, user: user).apply_scope(Post.all, type: :active_record_relation)
```

**Name the type Rails registered, not the one upstream's examples define.** The Rails matchers are `:active_record_relation` and `:action_controller_params`; the `:relation` seen in upstream's scope-matcher examples is a custom matcher those examples register themselves, and asking for it in an application that never registered one raises `ActionPolicy::UnknownScopeType`, observed on 0.7.6.

## Scope options

A scope block takes keyword arguments, which is the alternative to a second named scope when the difference is a flag rather than a different question:

```ruby
class PostPolicy < ApplicationPolicy
  relation_scope do |relation, with_deleted: false|
    scoped = relation.where(user: user)
    with_deleted ? scoped.with_deleted : scoped
  end
end
```

Prefer a named scope when the results answer different questions, and an option when they answer the same question about a different set of rows. A named scope is addressable from a spec by name; an option has to be reconstructed at every call site.

## Filtering parameters

```ruby
class UserPolicy < ApplicationPolicy
  params_filter do |params|
    user.admin? ? params.permit(:name, :email, :role) : params.permit(:name)
  end
end
```

This is where an attribute a role must not set belongs, rather than in a controller branch: the policy already knows the role, and a permitted-parameter list that lives beside the rules cannot drift from them.

## The guard

`verify_authorized_scoped` is what stops an action returning without scoping. It is a controller concern, and [rails.md](rails.md) owns it.
