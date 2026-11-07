# Metaprogramming

## When it pays

- Write ordinary code first, and metaprogram only where nothing else works or where it clearly pays for itself, such as a macro that removes a family of near-identical methods or a plugin loader. A method defined at runtime has no line a reader can find, and hooks fire where nobody expects them.
- Never generate what Ruby already provides: no `define_method` loop over `instance_variable_get` where `attr_reader` does the job.
- Reject a convenience that changes what a typo does, such as a class-level `method_missing` that defines whatever is called, because a misspelled name then succeeds instead of raising `NoMethodError`.
- Test every generated method, hook and `method_missing` branch, the unknown-name case included, as `testing.md` *What to test* says.

## Defining methods

- Turn repeated method definitions into a class-level macro that defines them, `paragraph_type :warning, font: :mono`, so each variant is one declarative line; remember that `self` in the macro is the class that calls it, a subclass included, and `self` inside the generated method is the instance.
- Define methods whose names are data with `define_method(name) { |arg| ... }`, not with an interpolated string passed to `class_eval`, because a block can be read, debugged and analysed, and a string cannot.
- Use string `class_eval` only on a measured hot path, as minitest, roda and sequel do. Even then, interpolate only names an anchored pattern allows, never input, and fall back to `define_method` for any other name. Show the generated code in a comment, so backtraces point somewhere real.
- Compute what a generated method needs, such as a constant lookup, once, outside the `define_method` block, and close over it, so the work happens at definition and not on every call.
- Inject a strategy object rather than redefine an instance method from a class method at runtime, because a redefinition changes every instance in every thread and makes tests that toggle it depend on their order.
- Decide at load time, in the class body, which methods a class defines when the choice depends on the platform or configuration, so the decision runs once and not on every call.
- Generate a family of methods from a table when they must stay in step with another API, as minitest generates each expectation from its assertion.
- Build a wrapping macro, such as memoization, from one anonymous module per class, prepended, with the wrappers defined in it calling `super`, so the original method stays callable and the wrapping shows in `ancestors`.
- Remember that a block never changes constant nesting: `class Name` inside `Other.class_eval do ... end` reopens the top-level `Name`, not `Other::Name`.

## method_missing

- Prefer methods generated with `define_method` when the set of names is known, because they appear in `methods`, in documentation and in stack traces, and an unknown name still raises `NoMethodError`.
- Use `method_missing` only for open-ended forwarding, a proxy to an object whose interface you do not know in advance, and then:
  - handle only names you recognise, and call `super` for the rest;
  - give the `respond_to_missing?` the linter requires the same test, ending in `super`;
  - forward with `...`, so keywords and the block go through;
  - never call a method in it that might itself be missing, because that recurses forever.

```ruby
def method_missing(name, ...)
  return super unless target.respond_to?(name)

  target.public_send(name, ...)
end

def respond_to_missing?(name, include_private = false)
  target.respond_to?(name, include_private) || super
end
```

- Build a transparent proxy on `BasicObject`, or use `SimpleDelegator` or `DelegateClass`, because methods every `Object` has, `to_s`, `inspect` and `==`, are never missing and would answer for the wrapper. Inside a `BasicObject` subclass, write `::Kernel.raise` and `::Time`, because it has no `Kernel` and constant lookup does not reach `Object`, and take an explicit `&block`, because `block_given?` is a `Kernel` method.
- Never let a proxy impersonate the implicit conversions, `to_str` and `to_ary`, unless it truly is that type.
- Delegate a known list of methods with `Forwardable`, as `objects.md` *Messages and roles* says, never with `method_missing`.

## Hooks

- Remember that `inherited` fires for every subclass, abstract intermediates included, at the moment the class body is read, so registration depends on load order.
- Use `Class#subclasses` to find subclasses instead of keeping a registry in `inherited`, because a registry is class-level mutable state and commits every member to one hierarchy. It returns direct subclasses only, in no promised order, so walk it recursively for a deeper hierarchy and never rely on its order.
- Offer instance and class methods as one mixin with a nested `ClassMethods` module that `self.included(base)` extends onto the host, so the host writes one `include`.
- Guard a `method_added` hook that defines methods with a flag set while it runs, because the definition fires the hook again and recurses until the stack overflows.
- Give anonymous classes made in tests and DSLs a readable name with `set_temporary_name`, rather than assigning them to constants.

## Changing classes you do not own

- In a library, never reopen a core or third-party class globally. Use a refinement, which applies only where a file activates it with `using`, so no other code in the process is affected.
- In an application, a patch is a last resort, chosen in this order: a refinement; `extend` on the one object that needs it; a new method on the class, with a name nobody else will choose; and last, an override of an existing method.
- Wrap an existing method with a prepended module that calls `super`, not with an `alias_method` chain, so there is no hand-named `__old_` method and the wrapping can be scoped to one object with `extend`.
- Never change what a core method returns or how it behaves, such as `gsub!` returning `nil` when nothing changed, because Ruby's own libraries and every gem rely on it.
- Report the bug upstream when a patch fixes one.
- Leave `Ruby::Box` to experiments: it is new in Ruby 4.0, opt-in and experimental.

## Refinements

- Put each core extension in its own refinement module named for the capability, `Ext::DeepDup`, and activate it with `using` only in the files that call it, because the `using` lines then list each file's dependencies and nothing leaks into the host application, as anyway_config does.
- Activate a refinement as narrowly as possible, inside the class or module that needs it, remembering that a top-level `using` lasts to the end of the file and a reopened class in another file does not see it.
- Share code between refinements of several classes with `import_methods` inside `refine`, because a refinement cannot `include` a module.
- Make a refinement for an optional dependency conditional on that dependency being loaded.
- Keep refinements private to a library, or document them as an opt-in API; and expect reviewers to know them less well than ordinary methods.

## DSLs

- Grow a DSL out of a plain API: a builder that yields itself, `config { |c| c.port = 80 }`, used directly, is often all the language needed.
- Switch to `instance_eval` and drop the explicit receiver only when many people write scripts in the DSL, because rebinding `self` hides the caller's instance variables and private methods inside the block.
- Give an implicit-receiver DSL no `name=` writers, because `port = 80` in the block makes a local and configures nothing; offer `port 80` or `set_port 80`.
- Yield the builder to a block that takes an argument and `instance_exec` one that does not, when both styles must work, and remember that a shipped DSL must be supported for years.
- Never define top-level DSL methods on `Kernel`; `extend` the main object with a module of delegators, as Sinatra does.
- Evaluate only trusted text with `instance_eval`, because evaluating a string runs arbitrary code.
- Keep the DSL a thin layer over classes that work without it.

## Dynamic dispatch and lookup

- Call a method by name with `public_send`, not `send`, so dynamic dispatch respects `private`; use `__send__` in a proxy whose target may define its own `send`.
- Never pass user input to `public_send`, `const_get` or `instance_variable_get` without an allow-list.
- Render an ERB template with `result_with_hash`, never `result(binding)`, because a binding hands the template every local variable in scope.
- Prefer a hash or a registry to `const_get` for finding a class by name, because `const_get` hides which classes are used from grep and from dead-code tools. Pass `false` as its `inherit` argument when you mean exactly that namespace.
- Capture a core method you must call on objects that may override it as an `UnboundMethod` in a private constant, then `bind_call` it.
- Answer "which definition runs?" with `method(:name).owner` and `super_method`, and never force an ancestor's version of a method your own class overrides with `instance_method(...).bind`; change the design, because the override exists to replace that version.

## Plugin systems

- Build plugins from plain modules with a fixed vocabulary, `InstanceMethods` and `ClassMethods`, plus optional `load_dependencies` and `configure`, as roda and sequel do. The host includes or extends whichever of those constants the plugin defines, so a plugin is an ordinary module whose methods compose through `super`.
- Include plugin modules, never prepend them, so a method the user writes in the class itself overrides every plugin and can call `super`.
- Give every extension point a no-op default in the host, so plugins override it, call `super` and stack in any order.
- Load a plugin's dependencies before including its own modules, so its methods reach the dependency's through `super`.
- Let a subclass load plugins without touching its parent: give each subclass its own subclasses of the host's inner classes in `inherited`, qualify them as `self::Book` in the plugin code, and pass hooks the class they configure.
- Decide for every class-level instance variable a plugin keeps whether a subclass copies the parent's value or starts fresh, and set it in `inherited`, because class instance variables are not inherited.
- Raise `ArgumentError` when `plugin` receives arguments or a block that no hook of the plugin consumes, because silently ignored configuration misleads the user.
- Keep an override at the visibility of the method it overrides, so a plugin never makes a public method private or a private hook public.
- Make loading a plugin twice harmless: record what is loaded, and only re-run its configuration.
- Freeze the configured class at the end of setup, remembering that this freezes its class-level instance variables too, so every class-level setter raises afterwards, and take an optimisation that replaces a generic method only after checking that no plugin overrides it.
