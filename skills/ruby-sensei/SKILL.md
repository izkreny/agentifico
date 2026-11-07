---
name: ruby-sensei
description: |
  The judgement half of writing Ruby 4.0: object and method design, collections, errors, concurrency with threads, fibers and Ractors, testing with Minitest, metaprogramming, gem and plugin authoring, and RBS types. Load it before writing, refactoring or reviewing Ruby code in any repository, tests and gemspecs included. It covers only what RuboCop cannot check, so it never replaces running the repository's linters. Not for formatting or anything RuboCop already reports, and not for Rails conventions, which live with Rails.
metadata:
  version: "1.0.0"
---

# Ruby sensei

The rules for Ruby that a linter cannot check: how code is shaped, not how it is spelled. Paths in this skill are relative to its own directory.

## Precedence

A repository's architecture decision records and its RuboCop configuration win wherever they differ from this skill. Follow them and do not flag the difference, because the repository chose it on purpose and this skill is a default for many repositories.

This skill targets Ruby 4.0. In a repository whose `<repo-root>/.ruby-version`, `<repo-root>/mise.toml`, Gemfile or gemspec pins an older Ruby, use no syntax, class or behaviour newer than that version, and check the release notes of the pinned version before relying on a rule that names a Ruby release.

Where its sources disagree, the rule as written in this skill is the one chosen; `README.md` records each such choice, so the sources are never re-weighed while writing code.

## What the linters own

This skill leaves out every rule that RuboCop enforces with its default configuration, and that rubocop-performance, rubocop-minitest, rubocop-thread_safety and rubocop-on-rbs enforce at theirs, at the versions `assets/floor.yml` records together with every cop the skill relies on. In a repository on other versions, `bundle exec ruby scripts/check_floor.rb --config <repo-root>/.rubocop.yml` names any of those cops that is off there, and the skill does not cover its rule. Run the linter rather than reasoning about these, and read every change an unsafe autocorrection, `rubocop -A`, makes before keeping it, because it can change behaviour; in a repository that runs no linter they still hold:

- Control flow: guard clauses instead of nested conditionals, `next` in loops, no nested ternaries or modifiers, `if` and `case` used as values, no redundant `return`, `self`, `begin` or double negation, `&&` and `||` rather than `and` and `or` in conditions.
- Exceptions: never rescue or raise `Exception` or subclass it, no empty `rescue`, specific rescues before general ones, no `return` in `ensure`, no `rescue` modifier, `raise` rather than `fail`, and `raise Klass, "message"`.
- Files and constants: the `# frozen_string_literal: true` comment, frozen literal constants, no class variables, no global variables, no top-level `include`, nested module definitions, and a class comment.
- Methods and arguments: boolean defaults as keywords, optional arguments last, no unused arguments, `method_missing` paired with `respond_to_missing?`, `super` in constructors and hooks, no nested method definitions.
- Names: snake_case methods and variables, CamelCase classes, SCREAMING_SNAKE constants, no `is_` prefix on predicates, no `get_` or `set_` accessors, memoised instance variables named after their method.
- Collections and strings: `each` rather than `for`, the dedicated `Enumerable`, `Hash` and `String` method for the job, such as `each_with_object`, `transform_values` or `start_with?`, endless ranges for slicing, interpolation rather than concatenation.
- Security: no `eval`, `Marshal.load`, `YAML.load` or `JSON.load` on untrusted input, no `Kernel#open` or `URI.open` with a computed argument.
- Gemspec and Gemfile: a `required_ruby_version` that matches the target, no `RUBY_VERSION` in the gemspec, no insecure sources, no duplicated gems.
- Tests and threads: the specific Minitest assertion (`assert_nil`, `assert_empty`, `assert_includes`), no global expectations; no mutable class-level state, no `Dir.chdir`, no bare `Thread.new` in library code.
- Size and complexity: the Metrics cops count method, class and block length, parameters, branches and nesting. Treat a Metrics offense as a signal, never a target: it names a count, and the fault behind it is in the references, such as a method doing two jobs, a class with two responsibilities, or a parameter list hiding an object.

RuboCop's pending cops, enabled only under `NewCops: enable`, and its disabled ones are not part of this floor: where one of them encodes a rule this skill states, the skill states it. A repository that enables more cops or more plugins adds its own floor, and where one conflicts with a rule here, the cop wins per *Precedence*.

## Before writing

Read the reference for each area the change touches, before the code exists:

| Area | Read it when the change | File |
| --- | --- | --- |
| Objects | adds or reshapes a class or module, a constructor, a value object, inheritance, a mixin or class-level state | `references/objects.md` |
| Methods | writes or changes a method, its parameters, its result, a block, a conditional or a name, which is nearly every change | `references/methods.md` |
| Collections | builds, searches, transforms or iterates arrays, hashes or sets, or writes an `each` | `references/collections.md` |
| Errors | raises, rescues, retries or translates an exception, or decides what a failure returns | `references/errors.md` |
| Concurrency | starts a thread, a fiber, an Async task or a Ractor, or touches state shared between them | `references/concurrency.md` |
| Testing | writes or changes a test, a double or a fake, or runs mutation testing | `references/testing.md` |
| Metaprogramming | defines methods dynamically, overrides `method_missing` or a hook, patches or refines a class, or builds a DSL or plugin system | `references/metaprogramming.md` |
| Gems and plugins | edits a gemspec, a gem's layout or loading, its dependencies, its versioning, its public API or a plugin interface | `references/gems.md` |
| Types | writes or changes RBS signatures, a Steepfile, or inline type annotations | `references/types.md` |

## Rules for every area

- Change only what the requirement needs: implement it as stated, ask about an ambiguous one rather than inferring a broader one, and leave working code nobody asked to change alone, however it reads, because an unrequested change is a bet nobody priced.
- Write the plainest Ruby that does the job: a method before a module, a core class before a gem, ordinary code before metaprogramming, because each step up is one more thing a reader has to learn.
- Add no abstraction, option, hook or plugin point before a second real use needs it, because the wrong abstraction costs more to remove than duplication costs to keep.
- Use a Ruby 4.0 feature where it says the thing more plainly, `Data`, pattern matching, `it`, keyword arguments, endless methods, and never only because it is new.
- Between two designs, ask what happens when the choice turns out wrong, and prefer the one whose failure is loud and cheap to undo.
- Apply a convention to a whole file or class, or not at all, because a half-applied convention reads as two conventions.

## Tools beyond the floor

These catch what neither RuboCop's defaults nor this skill's rules can. Use one where the repository already runs it, and suggest it to the owner, never install it, where the repository does not:

- **reek**, for design smells, such as feature envy, data clumps, control parameters and nil checks, that RuboCop does not look for. Its thresholds are signals in the same way as the Metrics cops.
- **Mutation testing**, to find the assertions a well-covered suite is still missing: mutant for an open-source project in a public repository, and evilution or mutineer elsewhere, as `references/testing.md` explains.
- **Steep**, to check RBS signatures against the code, as `references/types.md` explains.
- **vernier**, to find where the time goes before any change made for speed, as `references/objects.md` *Immutability* asks; it needs Ruby 3.3 or later and records threads, GVL waits and GC pauses. Compare two candidate implementations with **benchmark-ips**, which warms up and reports the spread, rather than timing one run.

`assets/rubocop.yml` is an opinionated RuboCop configuration for Ruby written with AI agents, offered for a new plain-Ruby project that has none; a Rails app keeps the rubocop-rails-omakase configuration Rails generates. Its comments say why each setting is there.
