# The formats that encode an issue number

Branch names, commit subjects, pull request titles and plan filenames. They live with the tracker because every one of them encodes an issue key, and `pr-flow` and `implement` point here rather than restating them.

## Quick reference

| Item          | Format                                                                                                    | Example                                           |
|---------------|-----------------------------------------------------------------------------------------------------------|---------------------------------------------------|
| Epic          | Feature-area name, label `epic`                                                                           | `authentication`                                  |
| Issue         | `action`, plus a layer label                                                                              | `add user lookup endpoint` + `backend`            |
| Spike         | `spike - question`, labels `spike` + layer                                                                | `spike - evaluate OpenAPI codegen` + `backend`    |
| Bug           | `what is wrong`, labels `bug` + layer                                                                     | `profile card crashes on empty name` + `frontend` |
| Draft         | Any of the above, plus the `draft` label; body may be a stub                                              | `add receipt export` + `backend` + `draft`        |
| Branch        | `{type}/GHI-{issue-number}_{slug}`                                                                        | `feat/GHI-50_login-form`                          |
| Commit header | `{type}: {description} (#{issue-number})`                                                                 | `fix: reject a blank email (#50)`                 |
| Plan file     | `YYYY-MM-DD_GHI-{issue-number}_{slug}.md`                                                                 | `2026-08-16_GHI-50_login-form.md`                 |
| PR title      | `{type}({scope}): {issue title}` - the scope is the issue's layer label, omitted when it repeats the type | `feat(backend): add user lookup endpoint`         |
| PR body       | Must contain `Closes #{issue-number}`                                                                     | `Closes #50`                                      |
| Assignee      | Issue: `@me` once work has started, cleared when set aside. PR: `@me` always, set at creation             | `--add-assignee @me`                              |

### Branch and commit type

`{type}` in a branch name is a **Conventional Commits type**, and it is the same vocabulary as the `type:` on a commit header and on a pull request title. One vocabulary across all of them, so a `fix` branch carries `fix:` commits and opens a `fix:` PR.

| Type       | For                                    |
|------------|----------------------------------------|
| `feat`     | New behaviour                          |
| `fix`      | A defect                               |
| `refactor` | Restructuring with no behaviour change |
| `docs`     | Prose                                  |
| `chore`    | Tooling, dependencies, config          |

That set is the one this skill assumes; the Conventional Commits ecosystem allows more (`test`, `build`, `ci`, `perf`, `style`). **A repository's existing branch names win over this default** — record the set in `.agents/gh-solo.md` if it differs.

**Type describes the change, labels describe the deliverable.** They are separate axes and neither derives from the other: a `docs` branch usually sits on a `docs`-labelled issue and a `fix` branch on a `bug` issue, but a `refactor` branch can serve a `feat`-shaped issue and a `chore` can close a `bug`. Never infer the label from the branch, or the branch from the label. **The word `docs` lives on both axes and asks a different question on each**: as a type it says the change is prose, as a label it says the deliverable is prose. They usually coincide, which is exactly why the scope rule below omits the scope when it would repeat the type.

**Commit header:** `{type}: {imperative description} (#50)`. The description is imperative and lowercase, and the issue reference goes at the end. A body is optional, one blank line after the description, and worth writing whenever the *why* is not obvious from the diff.

**That format describes a commit on a branch.** Where the repository squash-merges, the commit that lands on the trunk is built from the *pull request* title instead and carries `(#{pr-number})`, so the trunk references PRs while branch history references issues. Both are correct and neither should be "fixed" to match the other; the `pr-flow` skill owns that transition.

The spec's optional scope, `type(scope):`, is used in exactly one place: the **pull request title**, and from there the squash commit on the trunk. The scope is always the issue's **layer label**, never a fresh choice - decided once, on the issue, it cannot drift - and it is **omitted when it repeats the type**, so a `docs`-labelled issue with a `docs` type opens `docs: rewrite the readme`, never `docs(docs): …`. The trunk is the one place the layer is worth carrying: `git log --oneline` on `main` shows squash subjects two hops away from the issue's labels, and `feat(frontend): add login form (#60)` answers "what did this touch" without a hop. **Branch commits carry no scope.** Every commit on a branch would repeat the same value, and squashing deletes that history anyway; the header there stays `{type}: {description} (#{issue-number})`.

### `#50` in prose, `GHI-50` in names

**Use `#50` everywhere GitHub reads it**: commit messages, PR bodies, issue bodies, comments. It is the platform's own form, it autolinks to the issue with its title and state on hover, and `Closes #50` in a PR body is what closes the issue on merge. Nothing here invents an alternative to it.

**Use `GHI-50` only where `#` cannot go**: branch names and plan filenames. `#` is hostile in a shell and in a path, so the sigil that marks 50 as an issue number is unavailable, and a bare `50` in `git branch -a` or a directory listing says nothing about what it counts. `GHI` stands for GitHub Issue and supplies that missing label. This is a legibility rule, not a linking one — neither a branch name nor a filename autolinks anywhere.

The separator does the parsing, not the prefix. `{type}/GHI-{issue-number}_{slug}` splits on the first `_`, so the number falls out with one regex and no knowledge of the slug, which is what a scheme like `feat/50-login-form` cannot promise once a slug begins with a digit.
