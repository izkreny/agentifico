# Collections

## Choosing the container

- Use `Set` for membership and uniqueness, not an array searched with `include?` or a hash of `key => true`. `Set` is a core class in Ruby 4.0 and needs no `require`.
- Pass and return plain arrays and hashes unless a collection has behaviour of its own. When it does, wrap one, include `Enumerable` and delegate only what you support, rather than subclassing, as `references/objects.md` *Inheritance, modules and composition* says.

```ruby
class Parts
  extend Forwardable
  include Enumerable

  def_delegators :@parts, :size, :each

  def initialize(parts)
    @parts = parts
  end
end
```

- Turn a hash or array with known keys or positions into a `Data` record at the boundary where it enters, so callers send `wheel.rim` instead of indexing `row[2]`, and the shape is known in one place.
- Replace a `case` that maps keys to values or classes with a frozen hash lookup when the mapping is data that may grow.
- Remember that a lookup hash keyed by class misses subclasses: walk `superclass` on a miss, or keep the `case`, whose `when` honours inheritance.
- Never use a mutable object as a hash key unless its `hash` cannot change, because a key mutated after insertion cannot be found. String keys are safe, because `Hash` copies and freezes them.

## Lookups and defaults

- Use `fetch` when a key or an index must be present, and `fetch_values` when several must, because `[]` cannot tell a missing key from a stored `nil` or `false`, and `KeyError` names the key at the point of failure rather than far downstream.
- Give a default with `fetch(key, default)` for a cheap literal and `fetch(key) { compute }` for anything costly, never `hash[key] || default`, because `||` also replaces a stored `false`.
- Key a hash with symbols for names the program owns and with strings for data that comes from outside, and read and write each hash with one key type, because `h["name"]` never finds `h[:name]`, and frequent `to_s` and `to_sym` calls mean the wrong type was chosen. Convert where outside data enters, such as `JSON.parse(text, symbolize_names: true)`.
- Take a method's options as keyword arguments, per `references/methods.md` *Parameters*, and keep `fetch` for genuinely dynamic hashes, such as `ENV`, parsed JSON and configuration.
- Never share a mutable default between keys or slots, `Hash.new([])` or `Array.new(3, [])`: use `Hash.new { |h, k| h[k] = [] }` and `Array.new(3) { [] }`, because the default object is the same object for every missing key and every slot.
- Memoise into a hash with `cache.fetch(key) { cache[key] = build(key) }`.
- Normalise "one, many or none" with `Array(value)` before iterating, remembering that `Array(hash)` yields pairs.

## Iterating

- Say what the loop is for with the specific `Enumerable` method, `find`, `find_index`, `select`, `partition`, `group_by`, `sum`, `tally`, `each_with_object` or `each_slice`, never an `each` that fills an accumulator or an index counter, because the method name is the intent and the manual loop hides it in mutable state.
- Keep a chain of `select`, `map` and the rest readable, and give a step a name by extracting a method once the chain stops reading as a sentence.
- Never add to or remove from a collection while iterating it, because the cursor shifts and elements are skipped. Build a new collection with `reject` or `select`, or iterate a copy.
- Remember that `any?`, `none?` and `one?` without a block test truthiness, so they differ from `count.positive?` when the collection holds `nil` or `false`.
- Decide what an aggregate means on empty input, because `max_by`, `min` and `first` return `nil` there and `sum` returns `0`, and decide how a tie in `max_by` is broken, because it picks one element silently.
- In `inject`, make the block's last expression the new accumulator, or use `sum` or `each_with_object`, because the block's value replaces the accumulator, and a trailing `puts` resets it to `nil`.
- Never write a descending range, `10..1`, which is empty and iterates nothing: count down with `downto` or `reverse_each`. Test a value against bounds with `cover?`, because on a range of strings `include?` asks whether the range enumerates the value, and `("a".."z").include?("bb")` is false.
- Process a large file line by line with `File.foreach` or `each_line`, never `read` or `readlines`, so only one line is in memory at a time.
- Reach for `lazy` only for large or infinite sequences, `(1..).lazy.map { ... }.first(5)`, because on a small collection it only adds overhead, and end the chain with `first(n)` or `to_a`, because `take` and `map` on a lazy enumerator return another lazy enumerator.
- Use the newer methods where they say exactly what you mean: `Hash#except`, `transform_keys(old: :new)`, `Array#intersect?`, `Range#overlap?`, `Enumerator.produce` for a sequence built from its previous value, and in Ruby 4.0 `Array#rfind`.

## Mutation

- Return new collections by default, and mutate in place only where the method exists to do that, as `references/methods.md` *Shape* says.
- Never assume a method without `!` leaves its receiver alone: `push`, `pop`, `shift`, `delete`, `concat` and `clear` all mutate, because `!` marks only the dangerous twin, as `references/methods.md` *Names* says.
- Freeze collections held in constants deeply, as `references/objects.md` *Immutability* says.
- Snapshot a collection, with `dup`, before yielding its elements to a caller's block that might mutate the source.

## Your own collections

- Name the primary iterator `each`, name others `each_<thing>`, and include `Enumerable`, so the class gains every enumerable method for one.
- Return an enumerator when no block is given, with a size block when the size is cheap, so one method serves both `each_word { }` and `each_word.select`, and return `self` when a block is given, as the core iterators do.

```ruby
def each_word(&block)
  return enum_for(__method__) { words.size } unless block

  words.each(&block)
  self
end
```

- Give a keyed or indexed collection of your own a `fetch` that behaves like the core one: raise `KeyError` or `IndexError` when the element is absent, and take a block for the fallback, because callers already know that contract.
- Keep the block of `Enumerator.new` free of side effects outside it, because it runs again from the start for every method called on the enumerator.
- Make enumeration over an unbounded or huge source bounded by default, and give the unbounded variant a name that says so.
- Give an element type with a natural order `Comparable` and `<=>`, as `references/objects.md` *Value objects* says, so `sort`, `min`, `max`, `clamp` and `between?` all agree.

## Pattern matching on data

- Check the shape of nested data and bind its parts in one step with `case`/`in`, `=>` or `in`, instead of a chain of `[]` lookups and `nil` checks, and keep `dig` for data where a missing level is a normal answer.

```ruby
config => { host:, port: }
log("ok") if response in { status: 200..299 }
```

- Find an element anywhere with a find pattern, `in [*, {id: 7} => hit, *]`, rather than a loop, remembering that it is a linear scan like the loop.
- Reject extra keys with `**nil`, as `references/methods.md` *Pattern matching* says.
