# Testing

## Writing tests

- Ship every change with its tests, written before or after the code, whichever suits the work.
- Watch every new test fail for the reason you expect, by running it before the code exists or by breaking the code it covers, because a test that has never failed may be testing nothing, or the wrong object.
- Write the simplest concrete code that passes, duplication included, and extract an abstraction only when *Rules for every area* in `SKILL.md` allows one.

## Refactoring

- Refactor only on green, in steps that change no behaviour, and never edit a test in the same step, because the tests are the only proof the refactor was one.
- When a new requirement does not fit, first refactor until it is a small addition, commit the refactor on its own, then add the change with its tests. If you cannot see how, name what you dislike in the code and remove the easiest smell first, because the route appears one smell at a time.
- Find an abstraction in duplicated code by flocking: take the pair of cases most alike, find their smallest difference, make the simplest change that removes it, run the tests, and repeat, removing the easy differences first. Name the difference, not the sameness, because the difference is the concept the code is missing.
- Roll in each change in stages, running the tests after each: the new code parses, it runs with its result ignored, its result is used, the old code is deleted. When a step turns the tests red, undo it and take a smaller one rather than debugging forward, because red after a refactoring step means something is not yet understood.
- Prove new code before deleting the old: write it beside the old code, switch to it in one step that a single undo reverses, then delete the old.
- Add a required argument to a method that already has callers in stages: give it a temporary, deliberately odd default such as `:FIXME`, change the method, move the callers over one at a time, then remove the default, because a method and all its callers cannot change in one green step.
- Change what a method returns in stages as well: let the method that receives it accept both the old and the new type for the duration, `return number if number.is_a?(BottleNumber)`, switch the producers one at a time, then delete the guard, because a type check that outlives the refactoring is the branching `objects.md` *Messages and roles* forbids.
- Extract a class by copying the methods into it unchanged, making the old class forward to it, and proving that with the old tests; only then simplify it, give it tests of its own, and remove the forwarders.
- Before renaming, moving or deleting a method, list its callers with the language server where the session has one, such as Ruby LSP, then grep for the name as a symbol and as a string, because Ruby LSP matches method references by name alone: it lists every method of that name in every class and misses calls made through `public_send`, `send` and `method_missing`. Its rename handles only constants, so rename a method by hand, and never delete one on the strength of an empty reference list.

## What to test

- Test an object through its public interface: assert the result of an incoming query, assert the side effect of an incoming command, assert an outgoing command by its effect on the real receiver, with a mock only when the receiver is outside your control, and never assert an outgoing query, because the receiver's own tests own that answer.
- Never test a private method, because it is the part meant to change; a class with so many private methods that it seems to need their tests is hiding a class to extract.
- Write the expected value as a literal, never computed by logic that mirrors the code, because a test that rebuilds the answer the code's way passes when both are wrong. Share setup between tests freely; share expected values never.
- Give every class its own test, except a small collaborator that is built inside one class and used only by it, which is tested through that class until it is injected or reused, because a unit test fails next to the fault.
- Choose test data that says what matters: ordinary values where the value carries meaning, and an obviously arbitrary one, such as a prime or a huge number, where it does not, because readers look for meaning in every value a test chooses.
- Test each behaviour once, in the test of the class responsible for it, because a duplicated assertion doubles the cost of every change and adds no confidence.
- Delete a public method nothing calls rather than testing it.
- Treat a test that is painful to write, with long setup, stubs returning stubs or a hard-coded collaborator, as a design defect to fix in the code, not a test to make clever.
- Test every monkey patch, refinement, `method_missing` branch and generated method directly, because those fail only at runtime and often only on the rare path.
- Measure branch coverage as well as line coverage, and read it one way only: below 100% proves code is untested, and 100% proves nothing.
- Create scratch files in a test with the block forms of `Dir.mktmpdir` and `Tempfile.create`, which remove them when the block ends.
- Keep unit tests fast, silent and independent of each other's files and state, and keep tests that need a database or a server apart from them, because a slow, noisy or order-dependent suite stops being run or trusted.
- Test both edges of a valid range and the first invalid value beyond each, because boundaries are where validation goes wrong.
- Run the suite with warnings on, `ruby -w`, because Ruby then reports a redefined method, such as a test copied without renaming that silently replaces the first, and shows deprecation warnings.

## Doubles

- Use the real collaborator, your own classes included, because then a renamed method fails the test as it would fail production, and a test that mocks your own objects pins how the code works rather than what it does.
- Replace only what you cannot control: an external service, the network, the clock, randomness. Inject it, ideally behind a wrapper you own, as `methods.md` *One job* says, and pass a double that plays its role: a plain Ruby object with canned answers for queries, or a mock for a command that must reach the outside world.
- When you replace a collaborator, prefer a fake whose output reveals what the class under test contributes, such as a fake mailer that returns the message it was handed, so the expectation shows what the class built and nothing the mailer does.
- Never assert what a mock returns. Give a mock a return value only when the code under test needs one to keep running, because a mock proves a message was sent, and its answer is the receiver's to test.
- Write a method that reads or writes a stream against the messages it sends, `<<` or `each_line`, so its test passes a `StringIO` or an `Array` instead of a real file, and inject randomness as a seeded `Random.new(seed)`, never the global `srand`.
- Make a stub return the class the real method returns, or an object answering everything later code may call, because a `Hash` standing in for a `Struct` keeps passing when the code starts calling `slice`, which only the `Hash` answers.
- Write the contract of each role, duck type or class hierarchy once, as a module of tests, and include it in the test of every player: each subclass, each class playing the role and each double, because a player that drifts from the contract keeps the suite green while production breaks, and a passing contract test is what makes a subclass substitutable. Give an abstract parent a second module for the hooks it requires of subclasses, included in every subclass's test, and test the parent's own behaviour through a subclass written only for the test.

```ruby
module ClockRoleTest
  def test_plays_clock_role
    assert_respond_to @role_player, :now
  end
end

class FakeClockTest < Minitest::Test
  include ClockRoleTest

  def setup
    @role_player = FakeClock.new
  end
end
```

- Test a library through the fake or validator it ships, such as `Sequel.mock` or `Rack::Lint`, rather than a hand-made imitation of it.

## Minitest

- Default to Minitest in a new plain-Ruby project, and follow whatever the repository already uses, because Minitest ships with Ruby and needs no DSL to read.
- Know Minitest 6, which Ruby 4.0 bundles:
  - `Minitest::Mock` and `stub` live in the separate `minitest-mock` gem, which must be in the Gemfile.
  - Expectations are not defined on `Object`, so write `_(value).must_equal`.
  - `assert_equal nil, value` fails rather than warns.
  - The `MiniTest` and `MiniTest::Unit::TestCase` names are gone.
  - Plugins load only when required or named with `Minitest.load`.
- Pass the expected value first, `assert_equal expected, actual`, so a failure message reads the right way round.
- Keep every test method public and named `test_...`, because Minitest runs only those, and a private or misnamed test silently never runs.
- Name each test after the rule it pins, `test_plural_above_one`, and give each special case its own test.
- Shape each test as setup, act, assert, so a reader finds the act in the same place every time.
- Keep assertions in the test methods and share only setup and teardown. To cover many near-identical cases, generate the tests from a literal table, so a failure names its case.
- Assert on structure, not on `inspect` output or exact backtraces, because both changed between Ruby 3.3 and 4.0 and will change again.
- Put only the raising call inside `assert_raises`, and assert the message where callers depend on it.
- Check printed output with `assert_output`, never by swapping `$stdout` by hand, because the assertion restores it when the test fails.
- Prove that a block or callback ran by setting a local flag inside it and asserting the flag after the call, rather than with a mock.
- Compare a `Float` result with `assert_in_delta`, never `assert_equal`, because float arithmetic makes exact equality depend on the order of operations.

## Mutation testing

- Use mutation testing as an audit of well-tested domain code, the value objects and the core logic, not as a gate and not on glue, controllers or views, because equivalent mutants survive forever and the run is costly.
- Read each surviving mutant as either an assertion missing from the tests or code the tests show is unneeded, and act on it; never chase a score.
- Run it on the subjects a change touched, using the tool's diff mode, and on the whole project rarely.
- Pick the tool by the repository:
  - In an open-source project in a public repository, use mutant with `mutant-minitest`, the mature choice. Run it with `--usage opensource`, and give each test class `cover "Foo#bar"`, because mutant only runs tests that declare what they cover.
  - Elsewhere, mutant's licence requires a paid subscription, priced per developer for an organisation. Never run it in a private repository without the owner's decision. Offer evilution or mutineer instead: both are MIT-licensed, run Minitest and are tested on Ruby 4.0, but both are young projects.
