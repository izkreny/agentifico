# Background Jobs

Background job design and review. Patterns from Campfire (Resque, a handful of thin jobs) and Fizzy (Solid Queue, multi-queue).

## Defaults

- Keep jobs shallow; the job body is one line calling a model method: `def perform(card) = card.notify_recipients`.
- Make jobs idempotent and safe to retry (e.g. rescue `RecordNotUnique` in the domain op).
- Fail loudly on real errors; avoid silent rescue patterns.
- Enqueue after commit: `config.active_job.enqueue_after_transaction_commit = true` fixes job-before-data races at the root. The config had deprecation churn around Rails 8.0/8.1 and is the default for new apps from 8.2; confirm it takes effect on the app's Rails version before relying on it.
- Prefer Solid Queue (database-backed) over Redis-backed queues for new apps; co-locate with Puma (`SOLID_QUEUE_IN_PUMA`) in small deployments.

## Naming Convention

- `_later` enqueues, plain name does the work, `_now` when you need an explicit synchronous twin:

```ruby
def notify_recipients          # the work: public API the job calls
def notify_recipients_later   # enqueues NotifyRecipientsJob (often private, called from callbacks)
```

- Capture enqueue-time context as keyword args (`Mention::CreateJob.perform_later(self, mentioner: Current.user)`); don't rely on `Current` at perform time.
- In multi-tenant apps, serialize tenant context into every job: prepend an ApplicationJob extension that captures `Current.account` at enqueue (as a GlobalID) and wraps `perform_now` in `Current.with_account`.

## Good Patterns

- Small job payloads; pass records (GlobalID) or IDs, never big object graphs.
- Queues split by criticality (`default`, `backend`, `webhooks`) with explicit priority order in queue config.
- Separate orchestration jobs from heavy processing jobs.
- Stagger recurring jobs at odd minutes (12, 27, 50) to avoid synchronized load spikes.
- Bulk enqueue: `due.in_batches { |batch| ActiveJob.perform_all_later(batch.map { DeliverJob.new(it) }) }`.
- Crash-safe long iteration with `ActiveJob::Continuable`: `step :dispatch` + `find_each(start: step.cursor)` + `step.advance!`. Essential for fan-out (webhooks, broadcasts, backfills).
- Serialize per-owner work with `limits_concurrency to: 1, key: ->(owner) { owner }` (Solid Queue).
- Two-tier async for high fan-out HTTP (web push): one job for the domain event, then an in-process thread pool for the HTTP calls. Resolve all AR data before posting to the pool; drop on `RejectedExecutionError` for backpressure.
- For `after_destroy_commit` async work, snapshot needed associations in `before_destroy`; the parent rows may be gone when the job runs.

## Recurring & Maintenance

- Recurring tasks invoke plain model class methods (`command: "MagicLink.cleanup"`), not dedicated job classes.
- Retention sweeps use `delete_all` on scopes (`stale.delete_all`); skip callbacks on stale rows.
- Schedule cleanup for finished queue jobs, expired tokens, old delivery records.
- Prefer reset-on-use over cron resets: check-and-reset inside the domain method (`spend` calls `reset_if_due`), not a scheduled job.
- Trim recurring schedules in beta/staging environments to essentials.

## Error Handling Policy

- Retry transient failures with `retry_on ..., wait: :polynomially_longer` (timeouts, DNS, `Net::SMTPServerBusy`).
- Don't retry permanent failures: rescue, classify by error class/message, log at `:info` severity (it's expected: bad address, full mailbox), and move on. Keep job queue resources for work that can succeed.
- Distinguish "destination failed" (record outcome, complete the job) from "our code raised" (mark errored, re-raise for retry); see [webhooks.md](webhooks.md).
- Package error taxonomies as concerns and include them into framework jobs (`ActionMailer::MailDeliveryJob.include SmtpDeliveryErrorHandling`).

## Verifying Job Behavior

- Don't unit-test trivial one-line job classes; specify async behavior from model specs by running the enqueued job and asserting the observable outcome (mention created, email sent), not job internals.

## Red Flags

- Jobs with complex branching and business rules embedded directly.
- Non-idempotent side effects without guards.
- Retrying permanently invalid inputs.
- Enqueueing jobs before required records are committed.
- Reading `Current.user`/`Current.account` inside `perform` without serializing it at enqueue.
- Per-item `perform_later` in a loop where `perform_all_later` or Continuable iteration fits.
- Cron-style reset jobs when reset-on-use logic is simpler and safer.
- Background jobs triggering spurious Turbo broadcasts (wrap in `suppressing_turbo_broadcasts`).
