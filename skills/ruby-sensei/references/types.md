# Types

Static typing in Ruby is RBS signatures checked by Steep. Duck typing in plain Ruby, which is most of what "types" means day to day, is `references/objects.md`; converting input at a boundary is `references/methods.md`.

## Whether to type

- Add signatures only where the repository already has them or the owner asks, because annotations are code to maintain and replace no test.
- In a repository that types, type the boundaries first: a gem's public API, and the seams between an app's major parts, because that is where a wrong object costs most and where signatures change least.
- Use RBS checked by Steep for new typed code. Use Sorbet only where the repository already does, and then follow its conventions, because RBS is the format Ruby itself ships and every tool reads, its interfaces are structural, so core classes satisfy them unchanged, and Sorbet's RBS-comment mode is experimental.
- Use TypeProf to draft signatures or as an editor aid, never as a CI gate, because it is experimental and only types the call paths it sees exercised.

## Where signatures live

- Write signatures in `<repo-root>/sig/`, one `.rbs` file per `<repo-root>/lib/` file, and point Steep at it with `signature "sig"`, because that is the layout rbs, Steep and gem loading all assume.
- Ship `<repo-root>/sig/` inside a gem, and check that the gemspec's `files` includes it, because downstream checkers load a gem's own `<repo-root>/sig/` first, and a directory left out of the package fails silently.
- Put signatures that only your own checks need under a directory starting with `_`, such as `<repo-root>/sig/_internal/`, because library loading skips it.
- Write inline annotations (`#:` and `# @rbs`) only where the repository already uses them or the owner opts in, and only on small plain classes: they are experimental in rbs 4 and Steep 2, cannot declare generics, visibility or `class << self`, and anything they cannot express silently becomes untyped or public.
- Never declare the same method both inline and in `<repo-root>/sig/`, because that is a duplicate definition.
- Do not adopt the `rbs-inline` gem, because its own README calls it a prototype whose feature is planned to move into rbs, after which the gem will be deprecated.
- Check which rbs the bundle resolves before writing inline syntax, because Ruby 4.0 bundles rbs 3.10, which predates it; inline needs the rbs 4 gem in the Gemfile.

## Writing a signature

- Accept the narrowest interface an argument needs, `_ToStr`, `_Each[T]` or one of your own, and return a concrete class, because an interface admits every object that answers the messages, exactly as the Ruby does at runtime.
- Turn a duck type the design already has into a named interface on its namespace, such as `interface _Preparer`, because it records the role the classes share; an interface names messages, not classes, so it stays duck typing.
- Declare what a mixin needs from its host with a self type, `module Htmlable : _Postish`, so the module stays duck-typed and is still checked.
- Mark a value that may be `nil` as `T?`, and a parameter that may be omitted as `?T`, because they mean different things and RBS excludes `nil` unless it is marked. Mark it yourself on a method that returns a `Hash#[]` lookup, because the core signature only annotates `Hash#[]` as implicitly returning `nil`, so the checker will not insist.
- Write a result that depends on the argument's type as overloads joined with `|`, one per line, rather than a union in and a union out, so each input type stays tied to its result.
- Use `boolish` for an argument that is only tested for truthiness, and `bool` only where exactly `true` or `false` is required, because Ruby callers honestly pass `nil` and other objects.
- Model keyword arguments as keywords (`?timeout: Integer`), never as an options hash, because the checker enforces the separation `references/methods.md` *Parameters* describes.
- Use a literal union for a closed set of options, `:read | :write`, rather than `Symbol`, so a misspelled value fails the check.
- Use a record, `{ id: Integer, name: String }`, for a hash with fixed keys, and a tuple for a fixed-size array; then ask whether that shape should be a `Data` class instead.
- Write `untyped` only as a stated, temporary escape, and never in a published API, because it switches checking off for every value it touches.
- Return `self` from a builder or chainable method, not the class name, so the type follows subclasses.
- Declare instance variables and private methods too, because Steep checks method bodies against them.

## Making the checker see the code

- Narrow with code the checker follows, `account = accounts.first or raise`, `if x`, `case x in Klass`, rather than a type assertion, because the guard also fails loudly at runtime and the assertion checks nothing.
- When nothing else narrows the type, write next to the assertion (`#: Account`) why the checker cannot see it.
- Silence one diagnostic at one line, `# steep:ignore NoMethod`, never a whole file, so the rest of the file stays checked.
- Mark metaprogrammed methods explicitly, `# @dynamic name` or a hand-written signature, because Steep cannot see them.
- Write signatures by hand for what checkers cannot follow: methods added by a prepended module, `DelegateClass`, forwarding through `send` and plugin modules found by name.
- Tighten gradually: separate Steep targets for `lib` and tests, `Ruby.strict` where the code is ready, `Ruby.lenient` for tests and legacy code.

## Keeping signatures true

- Run `rbs validate` and `steep check` in CI, because a signature that drifts from the code is worse than none: it lies with authority.
- Test a gem's shipped signatures against real calls, with `RBS::UnitTest` or the `rbs/test/setup` runtime harness in the test suite, because Steep proves only that callers agree with the signature, not that the signature matches what the code does.
- Treat `rbs prototype` and TypeProf output as drafts: write them to a separate `.gen.rbs`, review, and never overwrite a hand-written signature with them, because both emit `untyped` wherever they could not see.
- Commit `<repo-root>/rbs_collection.yaml` and `<repo-root>/rbs_collection.lock.yaml` and ignore the downloaded `<repo-root>/.gem_rbs_collection/`, as with any lockfile.
- Contribute a gem's types to gem_rbs_collection only when its maintainers will not ship them, and cover only the API its README documents, because a partial correct signature beats a broad wrong one.
