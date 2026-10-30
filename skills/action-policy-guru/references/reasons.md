# Failure reasons and messages

upstream: reasons.md, i18n.md

A denial that only says "no" forces the caller to guess. Reasons make the refusal say which check refused, which is what turns a `403` page into an actionable one and what lets a controller respond differently to different refusals.

## How a reason gets recorded

Only a check made through `allowed_to?`, `check?` or `deny!` is recorded. A rule composed out of bare predicate calls fails with no reason at all, which is the single most common reason a reasons hash comes back empty.

```ruby
class ApplicantPolicy < ApplicationPolicy
  def show?
    allowed_to?(:view_applicants?) && allowed_to?(:show?, record.stage)
  end

  def view_applicants?
    user.has_permission?(:view_applicants)
  end
end
```

The reason is keyed by the failing policy's identifier: `{applicant: [:view_applicants?]}` or `{stage: [:show?]}`.

`deny!(:no_user)` records a reason of its own, naming the condition rather than the rule.

`allowed_to?(:show?, record.stage, inline_reasons: true)` propagates the nested policy's own reason upward instead of reporting the nested call, so a refusal deep in a composition surfaces as `{stage: [:archived]}` rather than `{stage: [:show?]}`.

## Details

`details` is a hash a rule writes into, and it travels with the reason:

```ruby
class StagePolicy < ApplicationPolicy
  def show?
    details[:title] = record.title

    user.stages.where(id: record.id).exists?
  end
end
```

`result.all_details` merges every detail into one hash, which is what a controller branches on:

```ruby
rescue_from ActionPolicy::Unauthorized do |ex|
  ex.result.all_details[:not_found] ? head(:not_found) : head(:forbidden)
end
```

**This is how a policy asks for a `404`.** Whether a refusal should confirm the record exists is an authorization decision, so it belongs in the policy; the controller only carries out what the detail asks for, and stays ignorant of why.

## Messages

`ex.result.message` is the message for the rule that was called, and `ex.result.reasons.full_messages` is the list for every recorded reason. Both come from i18n under the `action_policy` scope, with policy translations under `policy`:

```yml
en:
  action_policy:
    unauthorized: "You are not allowed to do that"
    policy:
      stage:
        show?: "The %{title} stage is not accessible"
```

The lookup walks `action_policy.policy.<identifier>.<rule>`, then the same key for each policy ancestor, then `action_policy.policy.<rule>`, then `action_policy.unauthorized`, then the gem's own default. Details are the interpolation data, which is what `%{title}` above reads.

Because lookup is keyed by identifier, renaming a policy silently falls back to the generic message rather than failing. A message worth writing is worth a spec asserting the exact string.
