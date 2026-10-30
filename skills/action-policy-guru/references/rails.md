# Rails integration

upstream: rails.md

What the gem wires up on its own in a Rails application, and the hooks worth turning on deliberately.

## What arrives without configuration

`ActionPolicy::Controller` is included into `ActionController::Base`, and `current_user` becomes the `user` context. Neither happens for `ActionController::API` or `ActionController::Metal`, which need the module included and the context declared by hand:

```ruby
class ApiController < ActionController::API
  include ActionPolicy::Controller

  authorize :user, through: :current_user
end
```

`authorize :user, through: -> { Current.user }` is the form to use where the current user lives in `ActiveSupport::CurrentAttributes` rather than in a controller method.

Two config flags turn the automatic wiring off, `config.action_policy.auto_inject_into_controller` and `config.action_policy.controller_authorize_current_user`. Leave both alone unless something concrete demands otherwise: turning the first off from an initializer is the shape that hits the gem's Rails 8.1 initialization-order issue, `palkan/action_policy` issue 312, on 0.7.6 and earlier, fixed in 0.7.7, and turning the second off changes only how the controller builds the context, never what the policy requires. A policy inheriting `ActionPolicy::Base` still demands a `user` either way, so dropping the context without `authorize :user, optional: true` on the base policy trades a denial for a raise.

## Generators

```bash
bin/rails generate action_policy:install
bin/rails generate action_policy:policy Post
bin/rails generate action_policy:policy Post --parent=base_policy
```

The install generator creates `<repo-root>/app/policies/application_policy.rb` and nothing else.

## The verify hooks

`verify_authorized` adds an `after_action` that raises `ActionPolicy::UnauthorizedAction` when the action finished without calling `authorize!`. Without it, an action that forgets to authorize is indistinguishable from one that has nothing to authorize.

```ruby
class ApplicationController < ActionController::Base
  verify_authorized
end

class PostsController < ApplicationController
  skip_verify_authorized only: :show
end
```

**`only:` and `except:` name actions that must exist.** Where `config.action_controller.raise_on_missing_callback_actions` is on, as Rails generates it for development and test, a skip naming an action the controller lacks raises `AbstractController::ActionNotFound`, so a hook in a base controller takes `if:` instead; observed on Rails 8.1.

`verify_authorized_scoped` is the same guard for `authorized_scope`, raising `ActionPolicy::UnscopedAction`, and is what stops an `index` from quietly returning every row. Both have a dynamic form, `skip_verify_authorized!` and `skip_verify_authorized_scoped!`, for a branch inside an action.

**A skip is a claim, and the claim belongs next to it.** An action that skips because it is unauthenticated by design and one that skips because its policy is not written yet are the same line of code and different facts; name which it is, and where the second applies, name the issue that removes it.

**Watch each hook fail once before trusting it.** Remove a skip from an unconverted action, see the raise, put it back. A guard that has never been seen to raise is indistinguishable from one that is misconfigured, and both look green.

## Resource-less `authorize!`

`authorize!` with no argument infers the target from the controller name via `controller_name.classify.safe_constantize`, and infers the rule from the action name. Override `implicit_authorization_target` where the controller's name is not the resource's.

This is the form to reach for in `index` and `create`, where there is no single record to authorize.

## Rescuing the failure

```ruby
rescue_from ActionPolicy::Unauthorized, with: :deny_access
```

The exception carries what `SKILL.md` lists under *Applying a policy*. Rendering one status for every failure is the right start; branching on `result.all_details` is how a policy asks for a `404` instead of a `403` without the controller knowing why. See [reasons.md](reasons.md).

## Channels

Action Cable channels get the same `authorize!`, with `current_user` from the connection identifier, under `config.action_policy.auto_inject_into_channel` and `config.action_policy.channel_authorize_current_user`.

```ruby
class ChatChannel < ApplicationCable::Channel
  def follow(data)
    chat = Chat.find(data["chat_id"])
    authorize! chat, to: :show?
    stream_from chat
  end
end
```

Channels get no policy memoization, per *The layers that are already on* in [caching.md](caching.md), so a rule applied per message is applied for real every time, and a rule that queries is a query per message.
