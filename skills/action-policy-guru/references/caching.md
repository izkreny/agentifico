# Caching and instrumentation

upstream: caching.md, instrumentation.md

Authorization runs many times per request, and a rule that queries turns that into many queries. The gem layers caches for this; reach for them when a measurement says to, since each one trades away a guarantee that the rule is answering about the present.

## The layers that are already on

**Per-instance policy memoization** reuses one policy object across repeated authorizations of the same record in the same controller instance, keyed by `policy_cache_key`, falling back to `cache_key_with_version`, then `cache_key`, then `object_id`, so an Active Record record's key changes when it is `touch`ed; observed on 0.7.7. It assumes the caller is short-lived and the context constant, which is why it is in controllers and not in channels.

**Per-thread policy memoization** carries that across records: a list of comments whose rules each consult the same post builds one `PostPolicy` rather than one per comment. This is the N+1 authorization problem, and it becomes an N+1 query problem the moment a rule touches the database. Disabled under `RAILS_ENV` or `RACK_ENV` of `test`.

**Per-instance rule memoization** applies a rule once per policy instance and returns the remembered result. Through `allowed_to?` and `authorize!`, which resolve an alias before reading the memo, that makes an alias free; `apply` keys the memo by the name it was handed, so `apply(:edit?)` then `apply(:update?)` runs the rule twice; observed on 0.7.7.

Outside Rails, these are `ActionPolicy::Behaviours::Memoized` and `ActionPolicy::Behaviours::ThreadMemoized`. Outside the Rails executor, whatever includes `ThreadMemoized` calls `ActionPolicy::PerThreadCache.clear_all` at each request or job boundary, or a pooled thread carries memoized policies and their remembered results into the next request.

## The cache store

For a rule expensive enough to outlive the request, name it:

```ruby
class StagePolicy < ApplicationPolicy
  cache :show?, expires_in: 1.hour
end
```

```ruby
config.action_policy.cache_store = :redis_cache_store
```

The key is `cache_namespace/context_cache_key/record.policy_cache_key/policy_class/rule`, so every part of it is something you can control. The store must serialize an `ExecutionResult`, since the cached value carries the failure reasons and not just the boolean; the Rails cache stores do.

Define `policy_cache_key` on any record whose `cache_key` is expensive, or the cache lookup costs what it saved. A context object needs one too, or a `cache_key`: without either, the first cached rule raises `ArgumentError: object is not cacheable`; observed on 0.7.7.

`cache(user) { ... }` inside a policy caches an arbitrary value under the same scheme, which is the form for a permissions list read by several rules.

## Invalidation

Preferring a key that changes on its own beats invalidating: `"user::#{id}::#{role_id}"` for the actor and a `touch`ed timestamp on the record's access join make a permission change produce a new key with nothing to clear.

Failing that, `cache_namespace` overridden with a version constant discards everything at once, and a custom `rule_cache_key(rule)` plus `delete_matched` clears one actor or one pair, where the store supports wildcards.

**Override `rule_cache_key`, never the `cache_key(rule)` upstream's invalidation example shows.** The gem calls `cache_key` with every part of the key, so a one-argument override raises `ArgumentError` on the first cached rule, and only where a cache store is set, which a spec suite usually lacks; observed on 0.7.7.

## Instrumentation

`ActiveSupport::Notifications` events, on by default, off via `config.action_policy.instrumentation_enabled = false` before initialization:

- `action_policy.apply_rule`, on every rule application, carrying `:policy`, `:rule` and `:result`
- `action_policy.authorize`, on `authorize!` only, which is the one to watch: a high failure rate there means the interface is offering actions the user cannot take, rather than that the policy is wrong
- `action_policy.init`, on every policy instantiation, which is how memoization is verified rather than assumed
