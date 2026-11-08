# Errors

## Raise, or not

- Raise when a contract is broken: a caller passed what the method cannot work with, or the method cannot deliver what it promised. Never raise for an outcome the caller expects, such as invalid user input or "not found" in a search, and never use `rescue` as control flow, because an exception the code always expects is a `return` in disguise. The test: delete every `rescue`, and the happy path must still run.
- Return data for expected outcomes, and pick the shape by how many outcomes there are:
  - a benign value, an empty array or a null object, when the caller can carry on without the result;
  - a `Data` result matched with `case`/`in`, when there are several outcomes;
  - a yield or fallback block, when the caller should decide.
- Raise, rather than return `false` or `nil`, from a method called for its side effect, such as `save` or `update`, because callers ignore the result and a silent failure loses data. Pair it with a predicate such as `valid?` for code that branches on input it expects to be invalid, so that input never reaches the raise.
- Give a guard both a raising form for code that must not continue and a predicate for code that branches, `authorize(user)` and `allowed?(user)`, and make it fail closed, because an unchecked `false` lets the action through.
- In a guard or assertion helper, pass `caller` as `raise`'s third argument, so the backtrace starts where the bad value came from rather than inside the helper.
- Read the call stack through `caller_locations` and each location's `path`, `lineno` and `label`, never by parsing `caller` strings, whose format is not an interface.
- In a long multi-step job whose partial progress is worth keeping, collect the problems on the result and report them at the end instead of stopping at the first, because aborting discards the work done and the evidence for a flaky step.
- When unsure whether a condition is exceptional for the caller, let the caller choose, as `Hash#fetch(key) { ... }` and `Enumerable#find(ifnone)` do: raise by default, and take a block that replaces the raise.
- Reject unworkable input with a precise built-in error, at the boundary `references/methods.md` *Input at the boundary* describes.
- Use `value => pattern` when a mismatch is a bug, so it raises `NoMatchingPatternError`, and `value in pattern` when a miss is normal. Give every `case`/`in` an `else` unless exhaustiveness is the point.
- Use `throw`/`catch` for an expected early exit across several frames, such as stopping a parser once it has enough, because that is not a failure and needs no exception class.

## Which class

- Raise `ArgumentError`, `TypeError`, `KeyError`, `RangeError` or `IndexError` for plain misuse, because every caller already knows them.
- Give a library one namespaced root, `module MyLib; class Error < StandardError; end; end`, and raise only its subclasses for failures callers will rescue, because the exceptions a library raises are part of its API, and a client then rescues one class to catch them all.
- Add a subclass only when it carries data a handler needs, or when callers handle it differently. Never add one to mirror modules, layers or severity, because severity is the catcher's decision.
- To group existing errors without changing their superclass, tag them with an empty marker module, as Rack does with `Rack::BadRequest`, so `rescue ArgumentError` keeps working beside `rescue Rack::BadRequest`.
- Build the message inside the error class's `initialize` from structured data, and keep that data on the exception, so a raise site passes only what varies and a handler inspects fields rather than parsing text.
- Make a message name the offending input and what to do next, because the message is where a user meets the library.
- When callers start matching an error's message to tell cases apart, add a subclass for the case, so their existing `rescue` keeps working.
- When a public error class is renamed, alias the name callers already rescue to the new class, so their `rescue` clauses keep matching.
- Override `detailed_message(highlight:)` to decorate how an error prints, and keep `message` stable for code that reads it.

## Rescue

- Rescue the narrowest class at the one call that can raise it, and put everything that must run only on success in `else`, because an exception raised in `else` is not misreported as the failure of the guarded call.
- Prefer a method-level `rescue`, with the body as the happy path and the handling at the tail, over a `begin` block in the middle of a method. A `begin` block in the middle is usually a method waiting to be extracted.
- Keep a handler short: restore a sane state, then retry, translate or re-raise. A handler that does real work fails in turn and hides the original error.
- Around I/O, rescue `SystemCallError`, or the specific `Errno::` class, as well as `IOError`, because neither inherits from the other and the same call can raise either.
- When a library raises only a generic class, rescue it and `raise` again unless the message identifies the case you handle, and treat that as the last resort it is.
- Extract a rescue policy repeated at many call sites into a method that yields, `with_network_errors { ... }`, so the policy lives in one place.
- Pass a failure policy as a block or callable, defaulting to re-raise, instead of boolean flags like `ignore_errors:`, because only the caller knows what a failure means to it.
- Retry only transient failures, and only with a counter set before the attempt and a limit checked in the handler, because a retry cannot fix a bug or bad input and a forgotten counter loops forever. Back off exponentially with random jitter, so many clients do not retry in step, and keep work that cannot fail transiently, such as building the request, outside the retried block.
- Treat a transient response, such as HTTP 429 or 503, as a value to loop on, never raise one only to reach `retry`.
- Put a circuit breaker, from a maintained gem, around calls to a non-critical service, so its timeouts cannot slow the critical work.
- Put a broad `rescue StandardError => e` that logs and continues only at a bulkhead: the loop over jobs, requests or plugins, where one failure must not take the rest down. Make the reporter it calls unable to raise, because a failing error reporter is how one fault cascades.
- For a method that writes data users cannot recreate, or that error reporting relies on, decide what it leaves behind when it fails: the object still usable, its state rolled back, or no exception at all. Test that promise by making each injected outside dependency, the store, the network or the file system, raise in turn, because a failure between two writes is what happy-path tests never reach.
- Never let cleanup after a failure delete the evidence, such as a half-built resource and its log, because an intermittent fault then cannot be diagnosed.
- Release resources with the block form of the API, such as `File.open(path) { }` and `mutex.synchronize { }`, or in `ensure`, acquiring the resource before the `begin`, so a failed acquisition leaves nothing to release. Keep `ensure` small enough that it cannot raise, because a second exception there skips the rest of the cleanup and replaces the original error.

## Translating and re-raising

- Translate a foreign error at a library boundary by raising your own class inside the `rescue`, because Ruby sets `cause` automatically. Pass `cause:` only to set a different one. Never copy the original into an attribute of your own.
- Rescue your own namespace first and re-raise it untouched, then translate the foreign classes, so a boundary never wraps its own errors twice.
- Pass `cause:` to `Fiber#raise` when injecting an error into another fiber, and to `Thread#raise` only where interrupting a thread cannot be avoided, per `references/concurrency.md` *Threads*; both take it since Ruby 4.0.
- Never match on the text of a built-in error message, because Ruby 3.3 and 3.4 reworded `NoMethodError` and `NameError`; match the class, or fields such as `name` and `receiver`.

## Timeouts

- Use the deadline an API offers, such as `IO#timeout=`, `open_timeout:`, `Regexp.timeout` or Async's `with_timeout`, before `Timeout.timeout`, because `Timeout` raises asynchronously wherever the code happens to be, `ensure` blocks included.
- For a pattern run on untrusted input, check `Regexp.linear_time?(pattern)`, and rewrite the pattern or parse with `StringScanner` until it is linear; set `Regexp.timeout` only as the last guard.

## Threads and processes

- `join` or `value` every thread whose failure matters, as `references/concurrency.md` *Threads* says; `Thread.report_on_exception` only prints the error.
- Report failure in a command-line program with `warn` to standard error and a non-zero `exit`, or with `abort "message"`, which does both with status 1, and call either only from the program's entry point, so the rest of the code stays callable from tests. Both run `ensure` blocks and `at_exit` hooks; `exit!` skips them, and belongs only at the end of a forked child, so the parent's hooks do not run twice.
- Turn a failure that an API reports only through state into an exception at once: pass `exception: true` to `system`, and for other state, such as `$?` after a backtick command, write one method named for the check that raises, so the narrative of the caller is not interrupted by deciphering status codes.
- Write a command-line program's progress and diagnostics to standard error with `warn`, and only its results to standard output, so the output stays usable in a pipe. Parse its options with `OptionParser`, describing every option and collecting them with `parse!(into: options)`, and remove the options from `ARGV` before reading input through `ARGF`, which opens whatever is left in `ARGV` as files.
- To log a crash that no single `rescue` can wrap, register one `at_exit` hook: it runs after an uncaught exception and still sees it. Hooks run in the reverse order of registration.
