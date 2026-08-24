# Webhooks

Outbound/inbound webhook architecture and reliability. Modeled on Fizzy's event-driven webhook pipeline (with Campfire's simpler bot webhooks as contrast).

## Delivery Model (outbox pattern)

- Domain events enqueue one dispatch job; the dispatch job fans out, creating one persisted `Delivery` row per webhook, each with a state enum (`pending in_progress completed errored`, string-backed via `index_by(&:itself)`).
- Each delivery row auto-enqueues its own send via `after_create_commit :deliver_later`; persist first, deliver second, so state survives crashes and retries.
- Fan-out is crash-safe with `ActiveJob::Continuable`: cursor over matching webhooks (`find_each(start: step.cursor)` + `step.advance!`) so a mid-batch crash resumes, not restarts.
- Record request metadata (headers, payload) and response (status, body) on the delivery row for audit/debugging. Cap stored/streamed response bodies (~100KB) with a running byte count.
- Use a dedicated `webhooks` queue so slow destinations can't starve other work.

## Failure Classification (the key distinction)

- **Expected destination failures** (timeout, TLS, DNS, connection refused, HTTP 4xx/5xx): rescue, mark delivery `completed` with a symbolic error (`response: { error: :connection_timeout }`). The delivery ran; the destination failed. Do not retry the job.
- **Unexpected exceptions** (our bug): mark `errored!`, re-raise so ActiveJob retries.
- This split keeps retry behavior, dashboards, and delinquency tracking honest.

## Delinquency Circuit Breaker

- Track consecutive failures + `first_failure_at` per webhook; auto-deactivate after N failures spanning a minimum window (Fizzy: 10 failures over 1+ hour).
- Reset the counter on success.
- Surface inactive state in the UI with a manual reactivation endpoint (`resource :activation`).

## Security Baseline

- Treat webhook URLs as untrusted input; apply full SSRF protections (resolve + validate IP, block private ranges, pin IP, re-validate per redirect; see [security-multitenancy.md](security-multitenancy.md)).
- Revalidate destination at send time, not just on create.
- **Destination URL is immutable after create**; updates permit name/subscriptions only. Retargeting requires a new webhook (and new secret).
- Sign payloads: HMAC signature header + timestamp header.
- Whitelist subscribable events at the model layer: `normalizes :subscribed_actions, with: ->(v) { Array.wrap(v).map(&:to_s).uniq & PERMITTED_ACTIONS }`.
- Require admin-level auth for webhook management endpoints.

## Integration Adapters

- One delivery pipeline can serve multiple destination types: detect by URL pattern (`for_slack?`, `for_campfire?`), then vary content type, payload format (JSON/form/HTML), and rendering template per destination. Don't fork the delivery code per integration.
- Render payload URLs with tenant-correct `script_name` so links in payloads work.

## Inbound Webhooks (receiving)

- Verify the signature first (`construct_event`-style), then re-fetch canonical state from the provider's API instead of trusting payload content or ordering.
- For chat-bot style callbacks: gate what responses can do by content type (only `text/plain`/`text/html` become replies), and prevent loops; never trigger a bot from its own messages.

## Tenant Safety

- Keep webhook records and delivery queries tenant-scoped.
- Ensure event fan-out cannot leak cross-tenant data.

## Operational Hygiene

- Recurring cleanup of old delivery records by retention policy (e.g. every 4 hours, `delete_all` on a stale scope).
- Surface delivery status/history in the webhook admin UI.
- Emit useful logs/metrics for success rate, retries, and latency.

## Red Flags

- Fire-and-forget delivery with no persisted audit trail.
- Retrying destination failures the same way as code errors.
- Mutable webhook destination URLs.
- No circuit breaker; hammering dead endpoints forever.
- Unbounded reads of destination responses.
- No tenant scoping in delivery creation/lookup.
- No backpressure or queue isolation for high-volume events.
