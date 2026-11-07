> 🤖 Written by AI --- read/modified by izkreny! 🤓

# ruby-sensei

The judgement half of Ruby style, for an agent writing Ruby 4.0: how objects and methods are shaped, how collections are used, how errors are raised and handled, how threads, fibers and Ractors share state, how tests are written, when metaprogramming pays, how gems and plugins are built, and how RBS types are written. It covers only what [RuboCop](https://github.com/rubocop/rubocop) cannot check. It is not a formatter, a linter replacement or a Rails guide.

## Why it exists

RuboCop passes code that branches on an object's class in five places, rescues the right class at the wrong level, memoises shared state without a lock, tests private methods, metaprograms what a plain method would do, and ships a gem whose `files` list forgot its data. Those are the defects review keeps finding in agent-written Ruby, and no RuboCop configuration catches them. Agents already know Ruby; what they lack is the judgement the best Ruby books spend whole chapters on, and a reminder of which Ruby they are writing, since much of their training predates Ruby 3. One skill shared by every repository means an agent meets the same rules everywhere.

## Installation

```bash
npx skills add izkreny/agentifico -g -y -s ruby-sensei
```

That is the [skills CLI](https://skills.sh).

## Invocation

It fires on its own on Ruby work: writing, refactoring or reviewing Ruby code, tests and gemspecs. There is no argument. `SKILL.md` loads first and sends the agent to the reference for each area its change touches. A repository that wants it loaded every time names it in its agent instructions file.

| File | Area |
| --- | --- |
| `references/objects.md` | responsibility, dependencies, roles and duck typing, inheritance and modules, value objects, immutability, visibility and class-level state, factories, class names |
| `references/methods.md` | one job per method, its shape, input at the boundary, nil, conditionals, parameters, results, blocks, pattern matching, modern syntax, names |
| `references/collections.md` | choosing the container, lookups and defaults, iterating, mutation, your own collections, pattern matching on data |
| `references/errors.md` | when to raise, which class, rescuing, translating, timeouts, threads and processes |
| `references/concurrency.md` | choosing the model, shared state, threads, fibers and Async, Ractors, processes, concurrent-ruby, testing |
| `references/testing.md` | writing tests, refactoring in steps, what to test, doubles, Minitest 6, mutation testing |
| `references/metaprogramming.md` | when it pays, defining methods, `method_missing`, hooks, patches and refinements, DSLs, dynamic dispatch and lookup, plugin systems |
| `references/gems.md` | layout, the gemspec, dependencies, loading, versioning, public API, publishing, plugin design |
| `references/types.md` | whether to type, where signatures live, writing them, making the checker see the code, keeping them true |
| `assets/rubocop.yml` | an opinionated RuboCop configuration for Ruby written with agents |

## What it leaves to the linters

Every rule RuboCop and its plugins enforce at their default configuration is left out rather than restated. The list is *What the linters own* in `SKILL.md`, because the agent is its reader. The Metrics cops are kept as signals: the skill names the fault a count points at and never a number.

`assets/floor.yml` records the versions the floor was checked against and every cop the skill relies on. After upgrading RuboCop or a plugin, run the check, because `Preview` can switch a floor cop off in a minor release. Run it from the directory of a Gemfile whose bundle holds RuboCop and every plugin `assets/rubocop.yml` loads, rubocop-rake and rubocop-md included:

```bash
bundle exec ruby <skill-dir>/scripts/check_floor.rb
```

`--help` lists its options, and its output names each failure and the cops added or changed since the recorded versions.

## The shipped RuboCop configuration

`assets/rubocop.yml` is for a new plain-Ruby project that has no RuboCop configuration; a Rails app keeps the rubocop-rails-omakase configuration Rails generates. Copy it to `<repo-root>/.rubocop.yml`, and add `rubocop`, [`rubocop-performance`](https://github.com/rubocop/rubocop-performance), [`rubocop-minitest`](https://github.com/rubocop/rubocop-minitest), [`rubocop-thread_safety`](https://github.com/rubocop/rubocop-thread_safety), [`rubocop-rake`](https://github.com/rubocop/rubocop-rake), [`rubocop-md`](https://github.com/rubocop/rubocop-md) and [`rubocop-on-rbs`](https://github.com/ksss/rubocop-on-rbs) to the Gemfile's development group. It was read against the versions `assets/floor.yml` records, with rubocop-rake 0.7.1 and rubocop-md 3.0.0.

It turns on the cops chosen from those RuboCop ships disabled, after an audit that ran each one on real code, and it opts in to RuboCop's `Preview` mode so style reports without blocking, while Lint, Security and inline `rubocop:disable` comments fail the run; each setting's `WHY:` comment says the rest. It was tested against a fixture: a clean file passes, a style-only offense reports and passes, a rescued `Exception` fails, an inline disable fails, a long method reports at `info` and passes, and an `Exception` rescued inside a Markdown code block fails through rubocop-md.

## Sources, and the choices between them

Where the sources disagree, the skill takes one side:

- `raise` everywhere, over Exceptional Ruby's `fail` and `raise` split, which its own author calls taste; RuboCop enforces it.
- A `save` that raises on failure, paired with a predicate for code that branches, over Exceptional Ruby's `save` returning `false`, because a caller that ignores the result loses data silently.
- Standard exception classes for plain misuse and one namespaced root error for anything callers rescue, over the Ruby Style Guide's "prefer standard exceptions" alone, because every exemplar gem defines a root.
- Tests written before or after the code, whichever suits the work, with every new test seen to fail, over the test-first discipline of POODR and 99 Bottles.
- Real collaborators in tests, your own classes included, with doubles only for what the code cannot control, over POODR's and 99 Bottles' mocks and fakes for your own roles, because a test that mocks your own objects pins how the code works rather than what it does; the shared role test both books teach still keeps every player honest.
- `Data` for values and `Struct` only for mutable records, over the `Struct` and `OpenStruct` examples of the pre-3.2 books.
- Duck typing in the interior, with a class check allowed once at the boundary or on a stable core class, reconciling POODR and Confident Ruby with each other.
- Composition by default and inheritance for small, stable families of specialisations: POODR's chapter 8 over its chapters 6 and 7, and 99 Bottles' afterword over its early inheritance refactoring.
- Dependency constraints in a gemspec as a floor plus a ceiling at the next major for dependencies that follow semantic versioning, over [the RubyGems guides](https://guides.rubygems.org)' optimistic floor alone, because that is what the exemplar plugin ecosystems use and it still admits every compatible release.
- Development dependencies in the Gemfile, over the gemspec's `add_development_dependency` that Practical Ruby Gems still shows, as the Bundler 4 `bundle gem` template does.
- Zeitwerk for gems of more than a handful of files and plain `require_relative` for small ones, because both appear in the exemplar gems and neither is wrong.
- Separate `<repo-root>/sig/` files over inline RBS, which rbs 4 and Steep 2 still call experimental.
- mutant for open-source projects in public repositories, and evilution or mutineer elsewhere, because mutant's licence requires a paid subscription for any other project.
- concurrent-ruby's `Concurrent::Map` or a `Mutex` over `Concurrent::Hash` for compound operations, because on CRuby `Concurrent::Hash` is a plain `Hash`.
- No `protected`, with Polished Ruby, over Eloquent Ruby's use of it for comparisons between instances, because a protected method is listed by `methods` yet refuses `respond_to?`.
- Strict subclass substitutability, over Polished Ruby's deliberate exceptions, because an agent cannot guarantee that the stricter subclass never reaches code expecting the parent.
- Request context passed as arguments, with Polished Ruby, and `Fiber[:key]` kept for diagnostics such as a request id, where the concurrency sources store all request context there.
- Inner loops extracted into named methods, over Polished Ruby's keep-it-inline, because on Ruby 4.0.9 a named step measured as fast as the inline loops; only a yielding helper that hides the nesting cost more.
- A trailing comma after the last element of a multi-line array, hash or argument list whose elements each have their own line, over the Ruby Style Guide, Standard and rubocop-rails-omakase, which forbid it, because adding an element is then a one-line diff; in a survey of 361 Ruby projects, code that no rule constrains used it on 86.8% of such lists.
- A method-level `rescue`, with a mid-method `begin` read as a method waiting to be extracted, over The Well-Grounded Rubyist's narrow `begin`/`rescue` around the one risky line.
- A new exception class only when it carries data a handler needs or callers handle it differently, with Exceptional Ruby and the exemplar gems, over The Well-Grounded Rubyist's custom class wherever no built-in name fits.
- A builder that yields itself as the default DSL, over The Well-Grounded Rubyist's `instance_eval` constructor, because rebinding `self` hides the caller's instance variables and private methods.
- `Comparable` always paired with `<=>` for a natural order, over The Well-Grounded Rubyist's `<=>` alone for sorting, so every comparison agrees.
- Processes first for CPU-bound work, Ractors only where processes cannot serve and the owner accepts an experimental API, because Ruby 4.0.9 still warns that it is, and JRuby only as a last resort, where Polished Ruby ranks it before Ractors.

The books, from 2011 to 2026, predate parts of Ruby 3 and 4, so each rule was checked against the Ruby 4.0 release notes and, where it named behaviour, against Ruby 4.0.9 itself.

## Deliberate choices

- `allowed-tools` is omitted: the skill is reference material applied during ordinary coding, so it needs whatever tools the task already has.
- The rule against an abstraction before its second use restates a rule many owners keep in their global instructions; it stays, because the skill is also loaded where those instructions are absent.
- RuboCop, not [Standard](https://github.com/standardrb/standard), is the floor: Standard switches off cops RuboCop enables by default, so in a Standard repository some rules the skill leaves to the linters go unchecked.

## Inspiration

Books, distilled and never quoted beyond a phrase, each read in full, most of them twice by independent agents whose notes were then compared:

- Russ Olsen, *Eloquent Ruby*, 2nd edition, Pragmatic Bookshelf, 2026.
- Avdi Grimm, *Confident Ruby*, 2013.
- Avdi Grimm, *Exceptional Ruby*, ShipRise, 2011.
- Sandi Metz, *Practical Object-Oriented Design: An Agile Primer Using Ruby*, 2nd edition, Addison-Wesley, 2018.
- Sandi Metz, Katrina Owen and TJ Stankus, *99 Bottles of OOP*, 2nd edition (Ruby), Potato Canyon Software, 2021.
- Noel Rappin, *Programming Ruby 4*, Pragmatic Bookshelf, 2026.
- David A. Black and Joseph Leo III, *The Well-Grounded Rubyist*, 4th edition, Manning, 2026.
- Jeremy Evans, *Polished Ruby Programming*, 2nd edition, Packt, 2026.
- David Berube, *Practical Ruby Gems*, 2nd edition, Apress, 2025.

Ruby itself, each pinned to the commit read:

- [CRuby release notes 3.0 to 4.0 and the Ractor and Fiber documentation](https://github.com/ruby/ruby/tree/3e93b23afcec3433f6aecc34b5d832799d754238/doc), at v4.0.9.
- [rubychanges](https://github.com/rubyreferences/rubychanges/tree/a0e4f1f0ab09696dcf06bb5c7563286f27fd568e), Victor Shepelev's explained changelog.
- [The Ruby Style Guide](https://github.com/rubocop/ruby-style-guide/tree/72ea4198d617e5c3db425cb3806b68b71dcc129f), CC BY 3.0, for the reasoning behind its rules.

Linters and their documentation:

- [RuboCop](https://github.com/rubocop/rubocop/tree/58b3cac8fa31430996d632399f8ce6c311d1866d), [rubocop-performance](https://github.com/rubocop/rubocop-performance/tree/a63e7b2bb13eea2173ee080954af866664b107c1), [rubocop-minitest](https://github.com/rubocop/rubocop-minitest/tree/1179125efc6ae9b68d4b6fb0d5fa8364d85282e0), [rubocop-thread_safety](https://github.com/rubocop/rubocop-thread_safety/tree/441452421a4b91a7eee405dbf493e847071c3884), [rubocop-rake](https://github.com/rubocop/rubocop-rake/tree/890aabc9708da938d54f954cc8393732e86b8891), [rubocop-md](https://github.com/rubocop/rubocop-md/tree/938bb8b08a2518f782822734829bc15d3f6afb94), [rubocop-on-rbs](https://github.com/ksss/rubocop-on-rbs/tree/e42b63f984ff4fff923a1e856a66763a55591029) and [lint_roller](https://github.com/standardrb/lint_roller/tree/c803ede4224929955a68f765025695c9dff1b123).
- [reek](https://github.com/troessner/reek/tree/e8511a3831bfc5fa86750166f20a58694e21319f), for its smell descriptions.

Types:

- [rbs](https://github.com/ruby/rbs/tree/fe43c68ab3543d6d0229d914a69b9a67f1d0a899), [Steep](https://github.com/soutaro/steep/tree/db976689dcc6188f863016d0d8556d5f3bafa8ee), [TypeProf](https://github.com/ruby/typeprof/tree/3471536494117219114c20814549f7665302b3e1) and [gem_rbs_collection](https://github.com/ruby/gem_rbs_collection/tree/a2080c5762e4d22bf00ca0591eb4c8ec5d1fdd55).

Gems read as examples of Ruby written well:

- [zeitwerk](https://github.com/fxn/zeitwerk/tree/7e6dc10fcfc0ec174bec2c7a6ec19594d1b4579e), [rack](https://github.com/rack/rack/tree/da90464e3fa93e3cb49dc2d4ede798e6c6b70b4f), [minitest](https://github.com/minitest/minitest/tree/4f8b722a08ce19df32c56930cc27eaf12f0c23e3), [regexp_parser](https://github.com/ammar/regexp_parser/tree/c8210426b6b316fab03bd40a84e2276044755597), [roda](https://github.com/jeremyevans/roda/tree/095a70c0b7e59dcd9b870deecc66c867ed2d0e64), [sequel](https://github.com/jeremyevans/sequel/tree/4f96d5f8ad90b1a7c9bf5497b7af344de34ff761) and [anyway_config](https://github.com/palkan/anyway_config/tree/afcc843b834a965dcd5f8aa5b4b6af757bde93b6), its refinements in particular.
- [async](https://github.com/socketry/async/tree/d8f59c95c3083558aa543101ee5fdcc006054f4d) and [concurrent-ruby](https://github.com/ruby-concurrency/concurrent-ruby/tree/cdb9082c494aa597c439c85ded4969cb2150e37c), for concurrency practice.

Gem authoring:

- [The RubyGems guides](https://github.com/rubygems/guides/tree/bc60bbfd83d860c91e4198c4258b63083c115488).
- [The markdownifico project's research notes](https://github.com/izkreny/markdownifico/tree/7b4502bfb2ca8e2bfae2c6b977319d3437da093a/docs/research) on well-built reference gems and the plugin APIs of real tools.

Tools the skill names, each pinned to its release tag's commit and checked as the installed gem on Ruby 4.0.9:

- [Ruby LSP](https://github.com/Shopify/ruby-lsp/tree/6745c162fce98b1738f8f602fbca38806c6863aa) 0.26.11, for how it finds references and what it renames.
- [vernier](https://github.com/jhawthorn/vernier/tree/c76c9ac27db9ae68fed493c8b8042de36f0ed5cb) 1.12.0 and [benchmark-ips](https://github.com/evanphx/benchmark-ips/tree/4a0fac51a253de42e65299002ccf2aebf370434c) 2.15.1, for profiling and comparing implementations.

Mutation testing tools, each pinned to its default branch's last commit on 2026-11-06, when their licences, Minitest support and Ruby 4.0 support were read:

- [mutant](https://github.com/mbj/mutant/tree/233c802bad16ae2ef271cb4bd85d1f66c65238c5) 0.17.1, [evilution](https://github.com/marinazzio/evilution/tree/b525769eb2738dbad8c72f31708588b49c14bab1) 1.5.1 and [mutineer](https://github.com/davidteren/mutineer/tree/59a93caa9c29d00e9454c60c18c7e7bf69280839) 1.8.1.

Skills: go-style and rails-style, whose shape this skill follows.
