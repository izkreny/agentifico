# Concurrency

Ractor and the Fiber scheduler changed in every release from 3.0 on, so *Precedence* in `SKILL.md` matters most here.

## Choosing the model

- Use threads for blocking I/O and calls into native code when the work is modest, because they are the simplest model. Remember that threads in one Ractor share one lock, the GVL, so Ruby code in them never runs in parallel.
- Use fibers under a scheduler, in practice the `async` gem, for many concurrent I/O-bound tasks, because a fiber switch is cheap and happens only at I/O, `sleep` and queue or mutex waits. Choose them over threads by measuring at your real concurrency, because threads are simpler and can be as fast at modest counts.
- Use processes for CPU-bound work, by `fork`, `spawn` or a job runner, as *Processes* describes, because they run in parallel with any library and need no experimental API.
- Use Ractors only where processes cannot serve, such as data created after the workers start that is costly to serialise, only for work that shares nothing, and only where the owner accepts an experimental API: Ruby 4.0.9 still warns that the Ractor API "is experimental and may change", and many gems are not Ractor-safe.
- Consider JRuby, whose threads run Ruby code in parallel, only as a last resort, when neither processes nor Ractors serve and every native extension the code needs has a JRuby counterpart.
- Never give a fiber CPU-bound work, because it never yields and starves every other fiber on the thread. Move blocking native calls to a thread from fiber code, because a fiber stuck in C cannot be switched away from.

## Shared state

- Prefer, in order: no shared state, then shared state that is frozen, then mutable state behind a lock, because every step down multiplies the interleavings a reader must reason about.
- Never trust the GVL to make a multi-step update safe. Guard every read-modify-write, `@count += 1` included, with `Mutex#synchronize`, because a thread can switch between the read and the write.
- Put every step of an invariant under one lock, as with a withdrawal and its deposit, so no other thread sees the state between them, and nothing else, because every thread that reaches the lock waits for all of it.
- Read every value a guarded update depends on, the clock included, inside the lock, because a thread that read `Time.now` before waiting for the lock writes a stale value over a newer one.
- Create a mutex eagerly in `initialize`, never `@mutex ||= Mutex.new`, because lazily creating the lock is itself a race.
- Keep a lock private, behind `private_constant` or in a local a `define_method` block captures, because a caller that can take your lock can deadlock you.
- Never use `@value ||= compute` on an object shared between threads. Compute it eagerly, or check again inside the lock. `||=` is fine on an object only one thread or fiber ever uses.
- Never yield to caller code or call out to unknown code while holding a lock: copy what you need under the lock and yield after it, because a caller that takes the same lock deadlocks.
- Use `Concurrent::Map`, for instance `compute_if_absent`, or a `Mutex` for a shared cache, never `Concurrent::Hash` or `Concurrent::Array` for compound operations, because on CRuby those are plain `Hash` and `Array` without a lock.
- Keep configuration and registries in objects frozen once loading finishes, never in mutable class-level instance variables, because class-level state is shared by every thread.
- Give a non-thread-safe resource, such as a database connection or an HTTP client, to one thread or fiber at a time, through a pool.
- Never mutate a collection while another thread enumerates it: build a new one and swap the reference, or guard every access with the lock.
- Hand work between threads through `Thread::Queue`, and `close` the queue to tell consumers to stop. When several workers push to one results queue, have each push a sentinel when it finishes and count them, because closing the queue makes a still-running worker's push raise `ClosedQueueError`.
- Wait on a condition with a `ConditionVariable` inside a `while` loop, under the mutex, because a signal sent before you wait is lost.

## Threads

- Pass each thread or future its inputs as block arguments, `Thread.new(conn) { |c| serve(c) }`, never by closing over a loop variable, because the next iteration reassigns it while the thread still reads it.
- Write each line of output from a thread with one call, because separate `print` or `write` calls from several threads interleave.
- Run jobs on a fixed pool of threads popping a queue, never a thread per job. Size an I/O-bound pool by measured latency, not by CPU count, and a CPU-bound one by `Etc.nprocessors`.
- `join` or take `value` from every thread you start, and handle its errors there, because process exit kills unfinished threads and an exception reaches the starter only through `join`.
- Remember that `join(timeout)` returns `nil` on timeout and leaves the thread running.
- Pass the domain data a request needs, such as the current user, as arguments, because an ambient value hides a dependency. Keep only cross-cutting diagnostics, such as a request id for logs, in `Fiber[:key]`, which child fibers and threads inherit, and store only immutable values there, because `Thread.current[:key]` is fiber-local and `thread_variable_set` leaks across fibers sharing a thread.
- Avoid `Thread#raise`, `Thread#kill`, `Thread.stop` and thread priorities, because they interrupt code at arbitrary points, `ensure` blocks included. Cancel cooperatively: give the worker a flag or a cancellation object to check.
- Use `Queue#pop(timeout:)` and `SizedQueue#push(timeout:)` rather than `Timeout.timeout` around a queue.

## Fibers and Async

- Start an Async program with one top-level `Sync do ... end`, and spawn children with `Async`. Write a method that starts tasks to take `parent: Async::Task.current`, so it fails outside a reactor and a caller can pass a barrier or a semaphore instead.
- Group related tasks in an `Async::Barrier`, and cancel it in `ensure` after waiting, so one failure does not leave its siblings running.

```ruby
barrier = Async::Barrier.new
begin
  jobs.each { |job| barrier.async { run(job) } }
  barrier.wait
ensure
  barrier.cancel
end
```

- Bound fan-out with `Async::Semaphore.new(limit, parent: barrier)`, and pass data between tasks through `Async::Queue`, or `Async::LimitedQueue` for back-pressure.
- Bound every wait that could last forever with `task.with_timeout(seconds) { ... }`, and close resources in `ensure` inside each task, because cancellation arrives at whichever I/O call the task is in.
- Treat every I/O call and `sleep` under a scheduler as a point where another fiber may run, so no code spanning one is atomic, even when the call is only `p` or a log line.
- Mark helper tasks an object owns, such as a pruner or a refresher, `transient: true`, so they do not keep the reactor alive.
- Wait on every task whose failure matters: a failed task re-raises at `wait`, and an un-waited one only logs. Collect results from each task's return value, `tasks.map(&:wait)`, when their order matters, because a shared array fills in the order tasks finish.
- Use a fiber without a scheduler only as a generator, and prefer a lazy enumerator, which does the same with less machinery.
- Never write a Fiber scheduler of your own for application code; use Async's.

## Ractors

- Pass a Ractor its inputs as arguments, `Ractor.new(data) { |d| ... }`, because in Ruby 4.0 its block may not read any outer local variable, and a violation raises `ArgumentError` when the Ractor is created.
- Communicate through `Ractor::Port`: the receiving Ractor creates the port and hands it to senders, who `send` or `<<` to it. `Ractor.yield` and `Ractor#take` are gone in Ruby 4.0, so tutorials that use them are stale.
- Take a Ractor's result with `value`, and expect its failure as `Ractor::RemoteError`, with the original exception as `cause`.
- Make data shareable before it crosses: deep-freeze it with `Ractor.make_shareable`, or pass `copy: true` to freeze a copy. Hand over a large unshareable object with `move: true`, after which the sender may not touch it.
- Remember that sending an unshareable object without `move:` copies it deeply, so changes the receiving Ractor makes never reach the sender.
- Keep per-Ractor state, such as a cache, in `Ractor[:name]`, keyed by object in an `ObjectSpace::WeakKeyMap`, never in a class's or module's instance variables, whose unshareable values only the main Ractor may read. State that every Ractor must change lives in a database, or in one Ractor that owns it and answers messages, at a heavy cost per access.
- Make constants that Ractor code reads shareable, with `# shareable_constant_value: literal` in the file, a directive Ruby still documents as experimental, or `Ractor.make_shareable`, because a constant holding an unshareable object raises `Ractor::IsolationError` outside the main Ractor.
- Give `define_method` a `Ractor.shareable_proc` for methods other Ractors call, because an unshareable proc cannot run in another Ractor.
- Use no global variables and no writes to class-level state inside a non-main Ractor, and keep `Mutex` and `Queue` for threads inside one Ractor, because the Ractor guarantee covers only access across Ractors.

## Processes

- Load the application, then `fork` the workers, so they share its memory copy-on-write.
- Close file descriptors the workers must not share before forking, because every child inherits them.
- Write each line of output from a worker with one call, because separate writes from several processes interleave, and never let two processes write the same file without coordination, because processes share the file system.
- Reap every child, with `Process.wait` when its status matters and `Process.detach` when it does not, because an unreaped child stays a zombie and its status is lost. End a forked child with `exit!`, as `references/errors.md` *Threads and processes* says.
- Read a child's output with the block form of `IO.popen`, which closes the pipe, call `close_write` once all input is sent on a two-way pipe, because the child sees the end of its input only then, and use `spawn` rather than `fork` for code that must also run on Windows.
- Move, copy and delete files with `FileUtils`, never a shell command, because it needs no escaping and works on every platform.

## concurrent-ruby

- Use `Concurrent::Promises` for futures, and never its deprecated `Future`, `Promise`, `IVar`, `Delay` and dataflow.
- Chain with `then`, recover with `rescue`, combine with `zip` and `any`, and block only at the edge with `value!`, because `value` returns `nil` on failure and hides it.
- Run blocking work on the `:io` executor and short CPU work on `:fast`, and never block on another future inside a pool task, because that starves the pool.
- Use `AtomicReference#update`, `AtomicFixnum` and `Concurrent::Map` instead of a lock around a single value or map, and keep the `update` block free of side effects, because it may run more than once.
- Configure a thread pool with a bounded `max_queue` and an explicit `fallback_policy`, and shut it down with `shutdown` then `wait_for_termination`.

## Testing

- Keep the logic apart from the scheduling, so it is tested without threads, fibers or timing.
- Mark a Minitest class `parallelize_me!` only when its tests share no mutable state, files and class-level state included, because parallel tests race like any other threads.
- Test Async code inside a reactor fixture rather than sleeping, and assert limits by counting live tasks.
- Never let a test pass by waiting long enough, because a `sleep` in a test is a race that fails on a slow machine.
