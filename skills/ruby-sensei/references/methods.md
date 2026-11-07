# Methods

## One job

- Give each method one job at one level of abstraction. If describing it takes an "and", or its body changes topic halfway, split it, because a step with a name can be read, tested and moved, and a stretch of mixed steps can only be read.
- Replace a comment that explains a block of code with a method whose name says the same thing, because a name is checked on every call and a comment is checked by nobody.
- Stop splitting when the next piece would not be a coherent idea of its own, because a method that wraps one trivial call adds a jump and no meaning.
- Leave duplication in place until *Rules for every area* in `SKILL.md` allows a shared helper.
- Never paste behaviour another method owns; call it, so one fact lives in one place. Once a concept has a method, route every use through it, `successor(number)` rather than `number - 1`, even where the raw expression gives the same answer, because code that is right by accident hides that it depends on the concept.
- Write the call you wish existed first, then build the receiver to answer it, so the interface is designed from the sender's side.
- Wrap a call to a collaborator you do not control in a method of your own, so a change on their side touches one line.
- Never give your own method the name of one every object inherits, such as `send`, `method`, `display` or `class`, with a different meaning, because frameworks call those and the override breaks them silently.

## Shape

- Lay a method out in stripes, in order: gather and check input, do the work, deliver the result, and handle failure at the tail. Never interleave them, because checks scattered through the work make the reader carry every special case at once.
- Count a method's indirect inputs, its constants, instance variables, `ENV`, `Time.now` and files, as well as its arguments, and pass in the ones that vary, because each hidden input is a hidden dependency.
- Use `SecureRandom` for tokens, identifiers and secrets, never `rand` or `Random`, which are not cryptographically strong.
- Measure elapsed time with `Process.clock_gettime(Process::CLOCK_MONOTONIC)`, never by subtracting `Time.now` values, because the wall clock can jump.
- Make methods that do the same kind of thing take the same shape, so a reader sees difference only where the meaning differs; a guard clause in one and an `if`/`else` in its twin reads as a distinction that is not there.
- Use a guard clause for a rare early exit, and `if`/`else` when both branches are the method's story.
- Never mutate an argument unless mutating it is the method's documented purpose, because the caller holds the same object.
- Keep calculation in methods whose result depends only on their arguments, and push output, persistence and other side effects out to the methods that call them, because a pure method is tested with literals and is safe to call again.
- Give a local its value before a conditional that may not assign it, because Ruby creates the variable as `nil` when it parses the assignment, so a branch that never ran reads as `nil` instead of raising.
- Write a loop rather than recursion over input whose depth you do not control, because Ruby does not eliminate tail calls by default and a deep recursion raises `SystemStackError`.

## Input at the boundary

- Decide once, at the public entry point, what to do with each input: convert it into the role the method needs, reject it, or substitute a known-good value. Then trust it inside, because a check repeated in every private method is noise that hides the work.
- Convert untrusted input with the conversion functions `Integer()`, `Float()`, `String()` and `Array()`, not `to_i` and `to_f`, because `Integer("ham")` raises where `"ham".to_i` quietly returns `0`. Pass the base for decimal input, `Integer(input, 10)`, because without it a leading zero means octal and `Integer("010")` returns 8. Pass `exception: false` where `nil` is the failure you want, rather than rescuing.
- Parse a date or time in a known format with `Date.strptime` or `Time.strptime`, never `Time.parse`, which guesses the format and fills missing parts from the current date, and validate calendar input before `Time.new`, because `Time.new(2023, 2, 31)` rolls into March instead of raising. Remember that `Time + n` adds seconds and `Date + n` adds days, and step by calendar months with `Date#>>`.
- Pick one internal encoding, normally UTF-8: declare the external encoding when reading text and transcode where it enters, `"r:iso-8859-1:utf-8"`, read binary with `"rb"`, and never rely on the locale. Transcode with `encode`, which raises on a character it cannot map, and use `force_encoding` only to relabel bytes known to be in that encoding, because it changes no byte.
- Load YAML naming in `permitted_classes:` exactly the classes you expect, and never use `Marshal` for data that must outlive the Ruby version or leave Ruby, because the class list is the security boundary and the format changes between releases.
- Anchor a regular expression that validates input with `\A` and `\z`, never `^` and `$`, which match at every line break, so `"ok\nanything"` would pass.
- Write a dense regular expression across lines with the `x` flag and a comment per part, and test every one with strings it must match and strings it must not. Remember that Ruby's `m` flag is other languages' dot-all, that `\w` and `\d` match only ASCII unless the pattern says `(?u)` or uses `\p{L}`, and match file names with `File.fnmatch` or `Dir.glob`, never a regular expression written like a glob. Name captures, `(?<year>\d+)`, so an edit that adds a group renumbers nothing.
- In a `sub` or `gsub` replacement, refer to a capture as `'\1'` or use the block form, never `"#{$1}"`, because the string is built before the match runs, when `$1` holds the previous match.
- Test for literal text with `include?`, `start_with?` or `end_with?`, never `match?` with a string, which turns the string into a pattern, so `"axb".match?("a.b")` is true.
- Call an implicit conversion, `to_str`, `to_ary`, `to_int` or `to_path`, when you accept anything that truly is that type, and an explicit one, `to_s` or `to_a`, when you accept anything that can be shown as it. Define `to_str` or `to_ary` on your own class only when it truly is a string or an array, because implicit conversion makes `"a" + obj` work silently.
- Accept the core type and anything convertible by calling the protocol only when it is there: `path = path.to_path if path.respond_to?(:to_path)`, then use it as a `String`.
- Give a domain type of your own a conversion protocol, `to_meters` or `to_coords`, that the type itself answers with `self`, and call it on every input at the boundary, so a new class opts in by defining the method and anything else fails there with `NoMethodError`.
- At the border with an outside data source you do not control, state each assumption about its shape as an assertion where the data is first used, `fetch` for each key and `Float()` for each value, because the assertion fails at once, naming the assumption, when the source changes its format.
- Make a method that only reports, such as logging or metrics, the most forgiving of its input, because its worst case should be nothing recorded, never a crash in the work it observes.
- Escape every value for the place it lands: `ERB::Util.html_escape` in HTML, `URI.encode_www_form_component` in a URL, `Regexp.escape` in a pattern, and separate arguments, never one interpolated string, for `system`, `spawn` and `IO.popen`, because a single command string goes through the shell. Never interpolate into backticks or `%x`, which have no argument form; use `Open3.capture2` with separate arguments.
- Accept the object a method needs, not something it must first convert to that object.
- Wrap a collaborator that speaks a different interface in an adapter once, at the boundary, rather than branching on its type in every method.

## Nil

- Treat `x.nil?`, `x && x.foo` and a habitual `x&.foo` as type checks, and design them away where nil is not a real answer: a benign default at the top of the method, or a null object with the same interface. Use `&.` where absence is genuinely part of the data, remembering that it stops only on `nil`: `false&.to_s` still calls the method.
- When a missing value is non-essential, substitute a benign value once, near the top, `location = geocode(address) || group.city_location`, rather than guarding each use.
- Never build a null object on `method_missing` that answers everything with `self`, because it agrees to messages it does not understand and spreads.
- Never `rescue NoMethodError` to survive a nil, because it also hides every typo in the block.
- Never turn a `nil` that should not be there into `""`, `0` or `[]` with `to_s`, `to_i` or `to_a`, because the absence disappears and the fault surfaces far from its cause; `Array(value)` is for a value where none is a legitimate answer.
- Default a hash lookup with `fetch`, not `||`, as `collections.md` *Lookups and defaults* says.

## Conditionals

- Treat the same `case` on a class or a type field, repeated in several methods, as the branch `objects.md` *Messages and roles* replaces with polymorphism.
- Reshape the code when each new requirement adds another `when`, instead of adding it.
- Keep only what varies inside the branches of a conditional, and move what every branch repeats out of it, because repeated text hides the difference the branches exist for.
- Never let the last branch of a conditional on a category stand for "everything else"; name every known category and raise on an unknown one, because a new category otherwise takes a branch nobody chose for it.
- Use `case` when every branch tests the same subject, and `if`/`elsif` when the conditions differ in kind. Let `===` do the matching in `when`: ranges, classes, regular expressions and lambdas. Bucket continuous values with exclusive ranges, `0...1` and `1...3`, because inclusive integer ranges leave a value such as 2.5 in no bucket.
- Never assemble a sentence with a conditional inside a string interpolation; write the special case out until a pattern emerges.
- Keep an interpolated expression to a name or a method call, and compute anything longer into a local first.
- Never compare a condition to `true` or `false`, because many methods answer with a truthy object. Where `false` is a legitimate value, test `nil?` rather than truthiness, so a stored `false` is not mistaken for a missing value.
- Prefer an exact test (`==`) to a range (`<`, `!=`) when only one value is special, because it says which value that is.

## Parameters

- Use keyword arguments for options, for anything a caller must name to be understood, and for any list that may grow; required keywords have no default. Positional parameters are for one or two arguments whose meaning is obvious and stable, such as `x, y`.
- Pass a real keyword or `**hash`, never a trailing hash, because a trailing hash is a positional argument, not keywords.
- Declare `**rest` only when the method forwards or genuinely collects keywords, so an unknown or misspelled keyword raises. Declare `**nil` on a method with optional or rest positional parameters and no keywords, because without it a caller's keywords silently arrive as a positional hash, and adding a keyword parameter later changes what that caller passes.
- Never take a flag that picks which branch of the method runs. Write two methods and let the caller, who already knows, call the right one, because the flag couples caller and callee to the method's insides.
- Take a failure policy as a block or callable, as `errors.md` *Rescue* says.
- Treat a long parameter list as a missing object: the values that travel together are a `Data` class waiting to be named. Make one only for a concept that is also passed or returned elsewhere; options stay keywords, however many there are, because an options object adds a class and moves the ordering problem into its constructor.
- Compute a non-trivial default by calling a method, `chainring: default_chainring`, so a subclass can override it.
- Make a collaborator a caller must supply a required argument, not a default that only fits the first caller.
- Yield one object to a block, not a list of values, so the block's contract can grow.
- Forward arguments you do not inspect with `...`, and a lone block or splat with anonymous `&`, `*` and `**`, because spelling them out can drop a kind of argument.
- When one method passes options on to several callees, hand each its own keywords explicitly, `render(title:)` and `log(level:)`, rather than `**options` to all, so a misspelled keyword still raises.
- Remember that a bare `super` passes the parameters' current values, so reassigning a parameter before it changes what the parent receives, and write `super()` when the parent must receive nothing.

## Results

- Return the same kind of object on every path, and a collection, possibly empty, wherever there can be several, never an item on one path and an array or `nil` on another, because every variation is a branch in every caller.
- Make sibling methods whose names promise the same kind of answer, `parts` and `spares`, return objects that behave alike, because callers will treat them as one type. A method named like `successor` or `next` returns an object of the receiver's own role, and a method moved into a class that replaces a primitive changes its results to match.
- Never let a method that reads as a query change the object's state, because correctness then depends on the order of every call.
- Never design a writer to return anything useful, because `obj.x = value` always evaluates to `value`, whatever the method returns.
- Make a predicate return `true` or `false`, never `nil` or a truthy object, because callers compare and serialise the answer.
- Let a command whose outcome the caller expects to vary report it by yielding, or by returning a result object, rather than `true` or `false` that the caller has to interpret; a failure raises, as `errors.md` *Raise, or not* says.
- Do not chain bang methods, because many return `nil` when they change nothing, and make a bang method of your own built from them return `self` explicitly.
- Guard a ratio or an average against an empty denominator, because `0.0 / 0` returns `NaN` rather than raising, and `NaN` spreads quietly through every later sum.
- Build an expensive message lazily, with a block or a proc, when it is needed only on failure.
- Use `then` to transform a value inside a chain and `tap` to run a side effect that passes the receiver on, and keep side effects out of every other step of a chain.

## Blocks

- Accept a block only when the method uses it. Ruby 3.4 and later report a block passed to a method that ignores it: `-w` when no method of that name uses a block, and `Warning[:strict_unused_block] = true` even when another method of that name does.
- Decide what a method yields before anything else in its interface, and pass secondary callables as keywords, `on_error:`, because changing the number of yielded values later breaks every caller that passes a lambda; add a new method instead. Before adding a second policy callable, look for a responsibility to move out, because a method that needs several policies is doing several jobs.
- Write an execute-around method, `with_logging("load") { ... }`, for setup and teardown repeated around different work. Return the block's value, and run the teardown in `ensure`, because the block may raise, `break` or `return`. Take only what the wrapper itself uses and yield only what it creates, such as a connection, because the block already sees the caller's locals. Give a resource method a form without a block that returns the resource, as `File.open` does, so one method serves both uses.
- Capture `&block` only to store it or pass it on; otherwise `yield`.
- Declare a scratch variable block-local, `|item; total|`, when its name exists outside, because a block that assigns to an outer name overwrites the outer variable.
- Use a lambda when arity and `return` must behave like a method's, because a proc ignores arity and its `return` leaves the method that defined it.
- Do not let a long-lived block close over large objects it does not need, because the closure keeps them alive.
- Extract the inner loop of nested iterators into a method named for what it finds, never into a yielding helper that only hides the nesting. Never flatten the nesting with `Enumerator.product` or `Array#product` either, which run several times slower than the nested loops on Ruby 4.0.9.

## Pattern matching

- For nested data, follow `collections.md` *Pattern matching on data*.
- Pin an existing value with `^value`, because an unpinned name in a pattern silently rebinds.
- Remember that a hash pattern ignores extra keys (add `**nil` to forbid them), except `in {}`, which matches only an empty hash, and an array pattern must account for every element. A pattern is syntax, not a value, so reuse one by putting it in a method.
- Make your own classes matchable with `deconstruct_keys` and, for ordered values, `deconstruct`; `Data` provides both.
- Never read a variable bound by a match that failed.

## Modern syntax, used with judgement

- Write an endless method only for one short expression without side effects, such as a reader, a delegator or a formatter. Never use it for a setter, a conditional, or a body that reads as a command, because a trailing `if` or `and` binds to the definition, not the expression.
- Use `it` in a block with one obvious argument, and name the parameter once the body is more than one short expression. Never use `_1` and its kin, because a numbered name says nothing about the value.
- Omit a hash value, `User.new(name:, email:)`, only when the local variable means exactly the key, and keep the call's parentheses.
- Continue a long condition with a leading `&&` or `||` on the next line, which Ruby 4.0 allows, rather than a trailing operator, when it reads better.

## Names

- Name a thing after the concept it stands for, not its current value (`beverage`, not `beer`), because value names cascade into renames when the value changes.
- Name a new abstraction one level above the concrete cases it covers, in the domain's own words. To find the name, lay the cases out as rows and name the column.
- When no name fits, choose one too general over one too specific, because a too-specific name lies as soon as a second case arrives.
- Keep one concept per name: never reuse a variable or parameter name for a different concept in the same scope, and give values of the same shape different names wherever they mean different things, `max` for the song's last verse and `upper` for the end of a requested slice.
- Make a local variable's name longer the wider its scope, and a method's name longer the more rarely it is called, because a short name is cheap only where its meaning is in view or it is typed constantly. Keep a library's documented short names, Roda's `r` or Sequel's `DB`, even in long scopes.
- Call a writer as `self.name = value` inside the class, because a bare `name = value` creates a local variable and the writer never runs, and never give a local the name of a method in scope.
- Make a writer do what assignment implies and nothing else, because every `name=` call reads as an assignment.
- Name a delegating method for what the sender wants (`time_limit`), not for the chain it walks (`preferred_toy_durability`).
- Name a factory method with a generic verb, `BottleNumber.for(n)`, and never put the receiver's type into a message name, `hash_to_s`.
- Add `!` only when a safe twin without it exists, because the bang marks the dangerous one of a pair, not an important method.
- Name an execute-around method like syntax, `with_transaction`, and an iterator after the work it does, not the loop.
