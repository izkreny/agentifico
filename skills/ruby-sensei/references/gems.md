# Gems and plugins

## Layout

- Start a gem from `bundle gem`, because its layout, `<repo-root>/lib/<name>.rb`, `<repo-root>/lib/<name>/version.rb`, `<repo-root>/exe/`, `<repo-root>/sig/` and `<repo-root>/test/`, is what tooling and readers expect. Bundler 4 removed its `--rubocop` flag; pass `--linter=rubocop`.
- Put exactly one file at the top of `<repo-root>/lib/`, named after the gem, and everything else under `<repo-root>/lib/<name>/`; for a dashed name the entry file is the namespace path, `<repo-root>/lib/net/http/digest_auth.rb`, which `Bundler.require` loads when `<repo-root>/lib/net-http-digest_auth.rb` does not exist. Do so because every installed gem's `<repo-root>/lib/` is on the load path, and a top-level `<repo-root>/lib/set.rb` would shadow the standard library for every user.
- Wrap all of a gem's code in one module named after the gem.
- Name the gem so its name predicts the require path and the constant: underscores join words, `ruby_parser` for `RubyParser`; dashes mark an extension of another gem's namespace, `net-http-digest_auth` for `Net::HTTP::DigestAuth`; and never use capitals, because a wrong-case require works on a case-insensitive filesystem and fails everywhere else.
- Keep the version as one constant, alone in `lib/<name>/version.rb`, and read it from the gemspec with `require_relative`, so the gemspec evaluates without loading the gem.
- Put shipped executables in `<repo-root>/exe/`, each starting `#!/usr/bin/env ruby`, only requiring the gem and calling into it, with the command-line logic in `<repo-root>/lib/<name>/cli.rb`, as even a one-file script should be split, because a test cannot load a file whose top level runs the program; `<repo-root>/bin/` holds the repository's own development scripts. Never `require "bundler/setup"` in a shipped executable, because it would load whatever bundle the user's working directory has.
- Find bundled data files relative to the code, `File.expand_path("../data/rules.yml", __dir__)`, never the working directory.
- Keep a changelog, link it from `changelog_uri`, and state the release and Ruby support policy in the README, so a user can decide when to upgrade.
- Give every Rake task a `desc`, because `rake -T` lists only described tasks.

## The gemspec

- Set `required_ruby_version` to a lower bound, the oldest Ruby you test, with an upper bound only for a known break, because the field is a compatibility promise and raising it is a breaking change. For a new gem that is Ruby 3.2 or later; old floors such as Sequel's 2.0 are a support policy, not a pattern to copy. Leave `TargetRubyVersion` out of the gem's RuboCop configuration, because `Gemspec/RequiredRubyVersion` requires it to equal that floor, and RuboCop reads the floor from the gemspec when the setting is absent.
- Make `files` an allowlist of what the gem needs at runtime, the `git ls-files` list the template builds or an explicit `Dir[...]`, and include data files, `<repo-root>/sig/`, the licence and the README. Leave out tests, CI, dotfiles, `<repo-root>/Gemfile.lock` and development scripts. Add every new file to git before building, because the `git ls-files` list silently leaves untracked files out. Inspect the built gem with `gem unpack` before the first push, because a pushed gem is public and mirrored within minutes, and yanking cannot recall a leaked secret: rotate it at once.
- Before the first release, install the built gem and run it from a directory outside the checkout, because a path resolved against the working directory, or a file missing from `files`, still works inside the repository.
- Uncomment `spec.metadata["rubygems_mfa_required"] = "true"`, which the template ships commented out, so every owner needs MFA to push. No cop enforces it by default.
- Fill in the metadata URIs, homepage, source, changelog, bug tracker and documentation, and delete the template's `allowed_push_host` placeholder unless you push to a private server.
- Declare runtime dependencies with `add_dependency`, and development dependencies in the Gemfile.
- Keep a gemspec free of side effects and platform branches, because it runs on the publisher's machine at release time, and again on every machine that uses the gem through `git:` or `path:`.

## Dependencies

- Keep runtime dependencies few, because each one joins the dependency graph of every application that uses yours. The exemplar gems have none to two.
- Make a small gem depend on a large one only to bring its users new features, never to simplify your own implementation.
- Document system libraries and optional gems in the README, because a gemspec can express neither.
- Constrain a runtime dependency to the range you test: a floor at the oldest version that works, and, when the dependency follows semantic versioning, a ceiling at its next major, `"~> 2.1"` or `">= 2.1", "< 3.a"`, because a bare `"< 3"` admits prereleases such as `3.0.0.rc1`. Never pin a patch release, and exclude a single bad release with `"!= 2.2.1"`.
- Declare every standard-library gem you require that Ruby 4.0 does not load by default: `ostruct`, `pstore`, `benchmark`, `logger`, `rdoc`, `irb`, `reline`, `readline`, `fiddle` and `win32ole` became bundled gems in 4.0, as `base64`, `bigdecimal`, `csv`, `drb` and others did in 3.4, and under Bundler an undeclared bundled gem fails to load. `Set` and `Pathname` are core in 4.0 and need nothing.
- Commit `<repo-root>/Gemfile.lock` for an application and not for a library, because a library is always resolved together with its host application's gems.
- Never put credentials in a Gemfile source URL, because they land in `<repo-root>/Gemfile.lock`; set them with `bundle config set --global <host> <user:password>` or `BUNDLE_<HOST>`, and scope a private source to its gems with a `source "..." do` block.
- Comment every version ceiling or exact pin in a Gemfile with why it exists and what would lift it, because unexplained ceilings pile up into gems nobody dares upgrade.
- Never change `$LOAD_PATH` or call `Kernel#gem` inside a gem, because RubyGems already set the path and a runtime `gem` call bypasses the resolver.

## Loading

- Load a gem of more than a handful of files with Zeitwerk: `loader = Zeitwerk::Loader.for_gem; loader.setup` before the main module's body. Keep exactly one constant per file, matching its path, and require the entry file with `require`, never `load` or `require_relative`, because `for_gem` works from that file's location.
- For a small fixed set of files, plain `require_relative` in the entry file, as the template does, is equally good, and doubles as a map of the gem; choose one style per gem.
- Prove Zeitwerk compliance in the test suite with `loader.eager_load(force: true)`, so a mismatched file name fails in CI instead of in a user's application.
- Use `require_relative` for your own files, in a gem, a script or an application, and `require` for other gems and for a Zeitwerk entry file, so each line says which it is. Never `require "./file"`, which resolves against the working directory.
- Never leave `require "debug/open_nonstop"` in code that ships, because the process then keeps a debugger socket open for anyone to attach.
- Make extensions to core classes opt-in, through refinements or a separate file the user requires, never a side effect of requiring the gem.
- Load an optional dependency inside `begin`/`rescue LoadError`, and enable the code that uses it only when it loaded.
- Run another project's Ruby from a bundled process inside `Bundler.with_unbundled_env`, because `Bundler.setup` exports `RUBYOPT` and `BUNDLE_GEMFILE`, and the child would load your bundle.

## Versioning and deprecation

- Follow semantic versioning and say so: patch for fixes, minor for additions, major for anything that can break a caller. That includes a changed return value or default, a raised `required_ruby_version` and a tightened dependency.
- Start at 0.1.0, release 1.0.0 when the API is settled, and never reuse a version number: a yanked version is gone for good.
- Compare versions with `Gem::Version`, never as strings, because `"1.10" < "1.9"`.
- Break compatibility only for a substantial gain, and prefer changing a default the user can set back.
- Remember that adding a required keyword breaks every caller and an optional one none, and that moving an options hash to keywords breaks callers that pass a real `Hash`; accept both for a deprecation period, warning when the hash is used.
- Deprecate before removing: warn in one release, remove in a later major, and name the replacement and the removal version in the warning.
- Point the warning at the caller with `warn "...", uplevel: 1, category: :deprecated`, and say so in the changelog too, because Ruby shows deprecation warnings only under `-w` or `Warning[:deprecated] = true`. Deprecate a renamed constant with `deprecate_constant`, keeping a private alias for the gem's own use so it does not trigger its own warning.
- Keep a renamed public error rescuable, as `errors.md` *Which class* says.

## Public API

- Write down what is public: documented methods and constants are the API, anything marked `@api private` or `:nodoc:` may change in any release, and `private_constant` hides what must not be touched.
- Open the README with one paragraph on what the gem does and a usage example, because that is what decides whether anyone tries it.
- Check a name on RubyGems.org, on GitHub and against well-known products before announcing it, because a later rename throws away the recognition.
- Ship signatures in `<repo-root>/sig/` for the public API, as `types.md` describes.
- Give the gem one root error class, `MyGem::Error < StandardError`, as `errors.md` describes, and document what each public method raises.

## Publishing

- Turn on MFA for the RubyGems.org account, with a security key or passkey where possible.
- Publish from CI with Trusted Publishing, OIDC through `rubygems/release-gem`, so no long-lived API key exists to leak. A new gem can use a pending publisher for its first push.
- Where a key is unavoidable, scope it to pushing that gem, with an expiry.
- Publish the SHA-512 checksum of each released `.gem` in the repository, from `rake build:checksum`.
- Add as owners only people you trust with everything, because every owner can push, yank and add owners.

## Plugin design

- Keep the host's core small and make every feature an opt-in plugin loaded by name, as roda and sequel do, so users pay only for what they use and each feature has a clear seam.
- Load a plugin by convention: `plugin :name` requires `<host>/plugins/name`, which registers itself, and the host raises a clear error naming the plugin when the file is missing or did not register. Accept a module directly as well, for plugins that live in the application.
- Give plugins the fixed contract `metaprogramming.md` *Plugin systems* describes.
- Discover plugins that ship as gems through gemspec metadata, as RuboCop does with lint_roller: `spec.metadata["default_lint_roller_plugin"] = "MyGem::Plugin"`, a string because metadata is read before the gem is loaded. The host requires the gem and instantiates the class with its configuration.
- Keep the extension contract in its own tiny gem, or versioned module, with as few methods as possible, `about`, `supported?(context)` and `rules(context)` in lint_roller's case, and grow it only by addition, because every plugin and every host depends on it.
- Ship the backend or plugin contract's role test inside the gem, a module of Minitest tests that a third party includes in its own suite, so every implementation proves it honours the contract, as `testing.md` describes for doubles.
- Pass the host's facts to a plugin as one keyword object, such as a `Data` or keyword `Struct` context, so a new field never breaks an existing plugin.
- Ask each plugin whether it supports the running host, and report every unsupported one in a single error, so the user fixes them all at once.
- Return a plugin's failure as data the host reports, rather than raising across the boundary, so one broken plugin does not end the run.
- Change the extension API on the schedule in *Versioning and deprecation*, and keep the old mechanism working beside the new one for at least one major release, with a migration guide.
