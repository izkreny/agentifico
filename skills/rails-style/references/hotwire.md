# Hotwire + Realtime

Turbo/Stimulus/ActionCable architecture and reviews. Patterns from Campfire (cable-heavy chat) and Fizzy (streams-only kanban).

## Choose the Right Realtime Architecture

The proven 37signals topologies:

- **Streams-only (Fizzy):** no custom ActionCable channels at all. `turbo_stream_from`, `broadcasts_refreshes` + morph, lazy frames with ETags. Default to this for CRUD-ish apps.
- **Cable-augmented (Campfire):** custom channels only for lightweight JSON signals (presence, typing, unread pings) where rendering HTML server-side would be wasteful. Durable DOM state still goes through Turbo Streams.

Rule of thumb: Turbo Streams for anything that changes the DOM; bare ActionCable only for tiny ephemeral signals.

## Turbo Defaults

- Prefer server-rendered partial updates over heavy client-side state systems.
- Set global morph refresh in the layout: `turbo_refreshes_with method: :morph, scroll: :preserve`.
- Use Turbo Streams for targeted updates; one action can render a multi-target stream template that updates every affected region atomically (source column + destination + detail pane).
- A turbo_stream response keeps an HTML fallback (`format.html { redirect_to ... }`) so non-Turbo requests still work.
- Stable, predictable frame IDs: `turbo_frame_tag dom_id(@resource)`, never generated or random IDs.
- Canonical turbo_stream style: `turbo_stream.update [ @card, :new_comment ], partial: "cards/comments/new", locals: { card: @card }`.
- Lazy-load expensive sections with `turbo_frame_tag ..., src:, loading: :lazy` and give the frame endpoint its own `fresh_when` ETag. Extract frequently-changing fragments into their own frames so they don't bust the parent cache.
- Use `data-turbo-permanent` for elements that must survive navigation/morph (footer trays, in-progress editors).
- Block morph from clobbering client-owned state (e.g. localStorage-driven collapsed columns) via `turbo:before-morph-attribute` + `preventDefault()`.
- Exempt realtime-heavy pages from Turbo's page cache (`turbo_exempts_page_from_cache`); rely on frame-level ETags instead.
- Optimistic UI without a JS framework: server-render a `<template>` partial with `$placeholder$` tokens; client clones it with a generated ID before submit; the stream response replaces it.

## Broadcast Patterns

- Keep broadcast logic on models (`Message::Broadcasts` concern with `broadcast_create`), not in controllers.
- Scope every stream name by tenant/user: `[board.account, :all_boards]`, `[user, :notifications]`. Stream names are isolation boundaries.
- Dual streams when needed: `broadcasts_refreshes` for direct subscribers plus `broadcasts_refreshes_to ->(r) { [r.account, :aggregate_view] }` for account-wide views.
- Gate noisy secondary broadcasts on meaningful change: set a flag in `before_update` when preview-relevant fields change; broadcast `if: :preview_changed?`.
- Suppress broadcasts in background jobs that incidentally touch records (`Model.suppressing_turbo_broadcasts`), e.g. around ActiveStorage analysis.
- Fan-out efficiently: `render_to_string` once, then `broadcast_replace_to user, ..., html:` per recipient.
- Use `broadcast_*_later` async variants when synchronous broadcasting hurts request latency.
- Broadcast-rendered partials lack request context: wrap attachment/url helpers (`broadcast_image_tag` pattern) so URLs resolve.

## Reconnect & Catch-Up

- Catch-up over reload: on reconnect/tab-return, fetch a turbo-stream diff (`?since=<epoch_ms>`); server appends new records and replaces updated ones.
- An empty `HeartbeatChannel` gives reliable `connected`/`disconnected` callbacks for triggering catch-up and a debounced offline UI.
- Guard Stimulus `connect()` with a turbo-preview check so back/forward cache previews don't open sockets or request permissions.

## Stimulus Defaults

- Keep controllers single-purpose; compose multiple small controllers on one element.
- Prefer targets/values over ad-hoc selectors and attribute parsing.
- Always clean up timers/listeners/subscriptions in `disconnect`. For cable subscriptions, defer unsubscribe one animation frame and skip if the element reconnected (morph churn).
- Use event dispatch between controllers (or outlets) instead of tight coupling.
- For complex surfaces, compose `data-controller`/`data-action`/target wiring in Ruby helpers (`message_area_tag`) so views stay declarative and the contract lives in one place.
- Read page context from `<meta>` tags into a tiny `window.Current` object rather than inlining JSON.
- Will elements added later via broadcast get the behavior? Design controllers to handle dynamically-inserted children (e.g. `targetConnected` callbacks).
- State lives in Stimulus values (`this.openValue = true`), not written back into the DOM via `dataset`.

## Accessibility with Turbo

- Turbo navigation does not move focus like a full page load: manage it with a small Stimulus controller listening for `turbo:load` / `turbo:frame-load` that focuses `<main tabindex="-1">`, so screen readers hear the new page's heading.
- Flash region as a live region: `role="status"` + `aria-live="polite"` on the container, `role="alert"` for errors, so streamed-in messages are announced.

## Scroll & Interaction Contracts

- Preserve scroll declaratively: pass a custom attribute (`maintain_scroll: true`) on broadcasts and handle it once in a `turbo:before-stream-render` listener.
- Serialize competing scroll mutations through a promise queue when streams and optimistic inserts race.
- Strip a stream target's `id` on `turbo:submit-start` so background broadcasts can't race the form's own stream response.
- Infinite feeds: IntersectionObserver sentinels in turbo-stream pagination (remove trigger, append batch, append new sentinel); cap DOM size; only autoscroll when the user is at the latest page.

## ActionCable / Connection Safety

- Authenticate in `Connection#connect` with the same identity resolution as HTTP; scope channel subscriptions through ownership (`current_user.rooms.find_by(id: params[:room_id])`).
- Disconnect deactivated/banned users remotely: `ActionCable.server.remote_connections.where(current_user: user).disconnect`.
- Presence: reference-count connections with a TTL (`connections` counter + `connected_at`, 60s freshness scope) to survive multi-tab and reconnects; debounce visibility changes (~5s) to avoid flicker.
- Under path-based tenancy, emit the cable URL from `request.script_name` via a custom meta tag helper.

## Caching + Realtime

- Keep cache keys aligned with what affects output (record, user, timezone, filter state); use `touch: true` chains so child edits invalidate parents.
- Personalize cached fragments client-side: render `data-creator-id`, let a Stimulus controller compare against `Current.user` and toggle visibility. Don't break fragment caching for per-user toggles.
- Never HTTP-cache form pages; the rule and its reason are owned by the Always Flag list in the skill's own `SKILL.md`.

## Web Push (when applicable)

- Push only to disconnected users, excluding the actor; respect per-user involvement levels (everything vs mentions-only).
- Deliver via a thread pool with persistent HTTP connections, resolving all AR data before posting to threads; invalidate expired subscriptions async.
- Clean up the push subscription client-side on logout.

## Verifying Realtime Behavior

- Multi-user realtime needs one browser session per user in system specs (Capybara `using_session`), and a wait for `turbo-cable-stream-source[connected]` before asserting on broadcast effects.
- Assert broadcasts at the model layer as observable outcomes (a stream was broadcast to the scoped name), not by inspecting broadcast internals.

## Red Flags

- Duplicate stream IDs/targets causing unstable updates.
- Broadcast channels or stream names that are not tenant/user-scoped.
- HTML rendering inside bare ActionCable channels (use Turbo Streams).
- Stimulus controllers leaking timers/listeners after navigation.
- Replacing full pages for small interactions that should be streamed.
- Custom ActionCable channels for things `turbo_stream_from` already does.
- Morph refreshes destroying in-progress user input (missing `data-turbo-permanent`).
