# Objects

Contents: responsibility, dependencies, messages and roles, inheritance, modules and composition, value objects, immutability, visibility and class-level state, factories, names.

## Responsibility

- Give each class one responsibility you can state in a sentence without "and" or "or", because a class with two jobs changes for two unrelated reasons and cannot be reused for one of them.
- Move code that mostly reads and drives another object onto that object, and move an instance method that touches no instance state out of the class, because both sit in the wrong home and drag coupling with them.
- Read instance variables through readers, private ones by default, even inside the class, so the variable becomes behaviour defined once and a change of meaning is a one-method edit.
- Set every instance variable in `initialize`, and never read one a class does not set itself, because an instance variable that appears later hides an initialisation order, and objects that set their variables in different orders get different shapes, which slows every access and which `-W:performance` reports.
- Memoize by setting the variable to `nil` in `initialize` and filling it with `@total ||= compute` in the reader, and only for a value read more than once per object, once measuring shows it pays, as *Immutability* says, and never on an object threads share, as `references/concurrency.md` *Shared state* says. Memoize a value that can be `nil` or `false` in a cache hash instead, as `references/collections.md` *Lookups and defaults* shows, because `||=` recomputes a falsy value on every call.
- When one attribute is checked in one method, defaulted in another and branched on in a third, it is missing an invariant: establish it in `initialize`, through a private setter that checks the value, and let every method rely on it.
- Keep an object consistent after every public method, so it can always still do its job, and check business validity once, at the boundary where it is saved or sent on, because demanding validity at every step forbids the half-filled states an edit passes through.
- Add no public writer by reflex, because a public setter lets every caller depend on the representation; change state through methods named for the change.
- Split a class when a real requirement shows where the seam is, not before, because an early split is a guess; but do not leave a class whose name and contents disagree, because the next reader will copy it.
- Never split a class, or move its methods into modules, only to make it shorter. Split where a part is used elsewhere or changes independently, because a split by size scatters one concept across files.
- Give a domain object a `to_s` that reads well in a log or a message, and put any template-specific formatting in a separately named method. Apply presentation that depends on position, such as a capital letter at the start of a sentence, in the caller that assembles the sentence, never in the value.
- Hide secrets and noise from `inspect` by defining a private `instance_variables_to_inspect`, which Ruby 4.0 honours, rather than overriding `inspect`.
- Say in a comment above each class what it is responsible for, never how it works.

## Dependencies

- Inject collaborators through keyword arguments instead of naming their classes inside methods, because a hard-coded class name rules out every substitute and couples you to its constructor. Default the keyword to the usual collaborator, `formatter: PlainFormatter`, so existing callers keep working. Inject only what a test or a real variant needs to replace, and never a built collaborator whose state must agree with another argument, such as a schedule for a date passed alongside it: build it inside, or inject its class. An injected class answers a class-level method named for what the sender wants, `template.lyrics(number)`, so the receiver never reaches through it with `new(number).lyrics`.
- Depend on a message, not a class: know that the collaborator answers `diameter`, not that it is a `Wheel`.
- Depend on things that change less often than you do, because change flows along dependencies.
- Create objects at the edges, in a factory, a class-level entry point or the composition root, and pass them in, so instances use collaborators without knowing how to build them.
- Where you cannot inject, isolate the creation in one private method, so the dependency is visible and a change touches one line.
- Never call another class's or gem's private method with `send`, or read its instance variables with `instance_variable_get` or `instance_eval`; rethink the design first, and if you must, confine the call to one method you own, because a private method can change in any release.
- Wrap a foreign interface with an awkward signature, such as a long positional list, in one method you own that takes keywords.
- Never define `initialize` in a module; give the module a named setup method that the including class calls.
- Let behaviour that works on a clump of parameters move onto the `Data` class the clump becomes, the missing object `references/methods.md` *Parameters* says to name.
- Keep design-pattern words out of domain class names (`NumberDecorator`), because they describe the code's mechanics, not the domain.

## Messages and roles

- Design from the message: decide what needs to be asked, then who should answer. If nobody fits, that is the missing object.
- Ask for what you want, not how to do it: `mechanic.prepare(bike)`, not four calls into the mechanic's procedure, because the sender should not change when the receiver's procedure does.
- Keep the public interface small and stable, and everything else private, because callers depend on all of the public interface and on none of the rest.
- Never branch on what an object is, with `is_a?`, `respond_to?` before a call, or a `case` on a type attribute, to decide what it does. Give each kind of object the method, so the difference lives in one place, except the temporary guard that `references/testing.md` *Refactoring* allows during a staged change, and a conversion protocol checked once at the boundary, as `references/methods.md` *Input at the boundary* shows.
- Check a class only once, at the boundary where untrusted data enters, or for a stable core class such as `Array`, and nowhere in the interior. When you do, use `is_a?`, never `instance_of?` or `obj.class ==`, which reject every subclass. Test the exact class only where a subclass must not pass: `==` and `eql?` on a value, as *Value objects* says, and a test asserting which class a factory built, `assert_instance_of BottleNumber0, BottleNumber.for(0)`.
- Replace a category attribute that many methods switch on (`style == :road`) with small classes that each answer for themselves, and convert to them once, at the boundary.
- Represent a recurring absent value with a special-case object, such as `GuestUser`, and a do-nothing collaborator with a null object, such as `NullLogger`, when the same `nil` would otherwise be checked in many places. Keep the null object's interface explicit and small, and convert it back to `nil` at a public API, because Ruby cannot make it falsey. Never test whether an object is the special case; where a condition cannot be removed, ask a predicate both answer, `authenticated?`, so the condition states its intent.
- Convert foreign data with magic indexes or keys into an object at the boundary, in one place, so the shape of the raw data is known once.
- Model a pluggable step as a small object with one method, `call`, so any object answering `call` can take its place.
- Define an operator only where its meaning is universally understood, keep `+` and its kin free of side effects on either operand, and give a plainly named method beside it. An operator between two classes runs the left operand's method, so give a numeric-like value `coerce`, converting toward the more general type, or document that the order matters.
- Define `to_proc`, `call`, `===`, `[]` or `to_hash` only when you mean what Ruby does with them unasked: use as a block, as a callable, in `when`, as terse access and in a `**` splat.
- Make a wrapper's mutating method return `self`, never the result of the call it delegates, because `def push(item) = @items.push(item)` hands the caller the internal array.
- Delegate with `Forwardable` or `SimpleDelegator` instead of hand-written forwarders that must grow with the target.
- Fix a long chain of calls through other objects' collaborators (`customer.bicycle.wheel.rotate`) by giving the first receiver a method named for what the sender wants, or by redesigning, because the chain couples the sender to every object along it. Judge a chain by the objects it passes through, not by its dots: a pipeline of `Enumerable` or `String` transformations returns the same kind of object at every step and is fine. Never fix a real chain with `Forwardable` forwarders alone, because they hide the dots and keep the coupling.
- Pass `self` to a role player and let it ask for what it needs, `preparer.prepare_trip(self)`, so the sender sends one message to every player and knows nothing of what each one needs.

## Inheritance, modules and composition

- Choose by relationship: composition for has-a; a module or a shared duck type for unrelated classes that behave alike; inheritance only for a small, stable family of true specialisations. Prefer composition when it works, because it carries fewer built-in dependencies and can be changed at runtime.
- Make every subclass substitutable for its parent: it accepts what the parent accepts, returns what the parent promises and answers every message the parent answers. Never override a method only to raise "not supported".
- Make a variant differ by overriding the domain methods whose meaning differs, `quantity` or `container`, never a presentation method such as `to_s` hard-coded to what one caller prints, because that couples the class to one template and makes it claim false things about its concepts.
- Never subclass `Array`, `Hash` or `String`; wrap one and delegate, because many core methods return plain core instances and your subclass is lost on the first `map`.
- Treat a module that needs many methods renamed or overridden to fit a class as the wrong module for it, because the adapting shows the class does not share the behaviour.
- Build an abstract parent by putting the code in one concrete subclass and promoting what is shared, never by demoting from a concrete parent, because a missed promotion fails loudly and a missed demotion leaves wrong behaviour in the parent. A concrete class whose every behaviour is right for the general case may stay the parent instead, with one subclass per special case overriding only what differs, each passing the parent's contract test.
- Wait for a case beyond the second before settling an abstract parent when the duplication is cheap, because two cases rarely reveal which parts are shared.
- In a template method, give the parent the algorithm and the subclasses hooks with defaults, `local_spares`, and never make a subclass call `super` to take part, because a forgotten `super` fails silently, far from the cause. Where a hook has no sensible default, define it in the parent to raise `NotImplementedError` naming `self.class` and the hook, so a new subclass fails at once with the reason rather than with a `NoMethodError` far away.
- Keep hierarchies shallow, because every level is one more thing a change has to know about, and hooks decouple only adjacent levels: a third level must override a hook and call `super` again.
- Keep the set of messages an object answers small, and remember the lookup order when mixing in: a method the class defines beats one from its modules, and of two modules the one included last wins, so a module can be silently shadowed.
- Never make a library's users subclass your class to use it, because their classes may already have a parent.
- Extract a module from behaviour that works in one concrete class, give every hook the module calls a default, and document what the module needs from its host. Let a module reach the host's state through its readers, and make a module that needs state of its own a class instead, because a module's instance variables live on the host and clash silently with the host's and with other modules'.
- Use a module with `module_function` for stateless functions, never a class that only has class methods, because a class promises instances.

## Value objects

- Use `Data.define` for values: they have no setters, are frozen, require every member, accept positional or keyword arguments, copy with `with` and match patterns. Use `Struct` only when the record must be mutable, and `OpenStruct` never, because it runs on `method_missing`, is slow, and cannot be pattern matched by key.
- Choose the numeric class on purpose: `Integer` by default, remembering that dividing two integers truncates, so divide with `fdiv` when a fraction is wanted; `Rational` when repeated arithmetic must stay exact; `Float` when exactness does not matter; `BigDecimal` for fixed-precision domains such as money, built from a string or an integer, never from a float. Use `Time` for moments and `Date` for calendar days, never `DateTime`. Round, never truncate, when a computed `Float` becomes an `Integer`, `(price * 100).round`, because `33.8 * 100` is a hair under 3380.
- Validate or default `Data` members by overriding `initialize` with keywords and calling `super`.

```ruby
Money = Data.define(:cents, :currency) do
  def initialize(cents:, currency: "EUR")
    super
  end

  def to_s = format("%<amount>.2f %<currency>s", amount: cents / 100.0, currency:)
end
```

- Assign `Data.define` and `Struct.new` to a constant, with a block for extra methods.
- Give a primitive that carries behaviour, an amount and its currency or a number with its pluralisation rules, its own value class, and create a new value instead of mutating one.
- Define `==`, `eql?` and `hash` together only when instances are compared or used as hash keys, keep them symmetric, transitive and stable, let every field that votes in `eql?` vote in `hash`, built as `[self.class, *fields].hash`, and let `Data` provide them where it can. `==` and `eql?` hold only within one class, as `Data`'s do: test `other.instance_of?(self.class)`, because an `is_a?` test makes a parent equal to its subclass but not the reverse, and a subclass instance is never the same hash key. When a looser sameness is wanted, add a named comparison, `same_document?`, rather than stretching `==`, and make a wrapper delegate `==`, `eql?` and `hash` to the object it wraps.
- Include `Comparable` and define `<=>` for a value with a natural order, delegating to the fields' own `<=>`, so every comparison follows from one method; return `nil` from `<=>` for an object that is not comparable.

## Immutability

- Write no cache and no in-place mutation for speed before measuring: treat creating an object as cheap, profile, then fix the narrow part that is slow, because guesses about speed are usually wrong and a cache brings invalidation code that is hard to get right.
- Prefer objects that never change: return a new object for a changed value, as `Data#with` and Sequel's datasets do, because an immutable object is safe to share between threads and to reuse without defensive copies.
- Freeze constants that hold collections or strings, deeply, because `freeze` on a container leaves its elements mutable, and a constant's name only protects it from reassignment.
- Remember that `Data` freezes only itself: a member holding an array or a string stays mutable, so give it frozen members.
- Before keeping or caching anything derived from an argument the caller keeps a reference to, take a frozen copy, `@items = items.dup.freeze`, and never freeze the caller's object in place.
- Expose a collection the object keeps changing through a frozen copy or an enumerator, `@cards.dup.freeze` or `@cards.to_enum`, never the array itself, because a caller could otherwise change the object's state through the reader.
- To memoize in an object frozen at the end of `initialize`, keep one unfrozen cache hash in an instance variable and fill that, accepting that the object is then not Ractor-shareable.
- Make a library's classes work when frozen after setup, and give a class whose instances own mutable state a `freeze` that freezes that state and calls `super`, so a frozen object cannot still change its arrays.
- When copies must not share mutable state, deep-copy it in `initialize_copy`, which serves both `dup` and `clone`. Choose between them on purpose: `clone` keeps the frozen state and singleton methods, `dup` drops both, and both are shallow.
- Remember that the frozen-string comment freezes only plain literals: an interpolated string, and a string a method builds, stay mutable.
- Ruby 4.0 does not freeze string literals: they are chilled and warn on mutation under `-W:deprecated`, so the magic comment the linter requires is what makes them frozen, and a buffer you mean to mutate needs an unfrozen string.
- Use `Symbol#name` instead of `to_s` when you only read the string, because it returns a frozen string.

## Visibility and class-level state

- Avoid `protected`. When instances of a class need each other's state, read it through a public reader, as a `Data` value's members already are, because a protected method is listed by `methods` yet answers `false` to `respond_to?` and raises when called from outside.
- Remember that `private` forbids only an explicit receiver: subclasses call and override private methods freely, so a method a subclass must not touch belongs in a collaborator.
- Use `private_constant` for constants that are implementation detail, so callers cannot depend on them.
- Expose a value callers need through a method rather than a public constant when its shape may change, because a public constant freezes its shape into the API.
- Make a singleton a plain object in a constant with singleton methods, `Registry = Object.new`, or a module, rather than `include Singleton`, because the constant already is the one instance.
- Delete private methods nothing calls.
- Where a class variable would go, which the linter forbids, use a class-level instance variable behind a reader, or a frozen constant.
- Avoid class-level mutable state such as registries filled by `inherited`, and where it is unavoidable, handle it as `references/concurrency.md` *Shared state* says.
- Never define a method at the top level outside a script, because it lands on `Object` and leaks everywhere.

## Factories

- Put the decision of which class to build for an input in one factory, so callers never name the concrete classes and a new variant touches one place.
- Separate a conditional that chooses who answers, which belongs in the factory, from one that supplies the behaviour, which belongs in polymorphic objects.
- Start with a closed `case` in the factory, and open it to self-registration only when editing it costs more than the indirection. When the choosing logic is complex and changes with each candidate, give each candidate class a `handles?(input)` predicate and let the factory ask them in a fixed order with the catch-all last, because the choice then lives with the code it changes with.
- Offer alternative constructors as named class methods, `Money.from_cents`, rather than one `new` that inspects its arguments.
- Keep behaviour on instances; keep class methods for construction and for what the class itself answers, such as `handles?` or a table name. In a class method, build with bare `new`, never the class's own name, so an inherited factory builds the subclass.

## Names

- Name a class for what it is, not a generalisation it might grow into, and rename it as soon as it outgrows the name.
- Group names that share a prefix into a namespace module, `Toner::PrintQueue` rather than `TonerPrintQueue`, and keep nesting to about two levels.
- Never name a nested class after a core class, `MyGem::String`, because every bare `String` inside the namespace then means yours, and the core class needs `::String`.
- Name classes as nouns and behaviour modules, where it reads well, as adjectives, `Comparable` and `Enumerable`, so `include` reads as a statement about the class.
- Name subclasses that a factory chooses between after the trait it selects on.
- Put protocol strings and repeated keys in constants, so a typo raises `NameError` instead of silently missing.
- Never define a top-level constant named `Ruby` or put your own code inside it, because Ruby 4.0 defines `Ruby` as a core module.
