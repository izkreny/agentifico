# Repository settings and branch protection

**`workflows/merge.md` assumes these, and this file owns them.** Every value is per-repository and none is the default, so each is checked once per repository rather than every merge; the workflow reads none of them on an ordinary run.

## Repository settings this assumes

Read them in one call:

```bash
gh api repos/{owner}/{repo} --jq '{allow_squash_merge, allow_merge_commit, allow_rebase_merge, delete_branch_on_merge, squash_merge_commit_title, squash_merge_commit_message}'
```

- **`delete_branch_on_merge: true`** — otherwise every merged branch stays on the remote forever, and this setting is what deletes it: Step 3 of `workflows/merge.md` passes no `--delete-branch`, for the reasons given there. It also covers a PR merged from the GitHub UI, which no flag of this workflow ever could. Where it is off, the remote check in Step 4 of `workflows/merge.md` is what catches the leftover branch.
- **`squash_merge_commit_title: PR_TITLE`** is what makes the PR title become the commit subject, and it is the **only** value that may accompany `PR_BODY` - GitHub validates the pair and rejects every other combination with a `422` (`invalid_squash_commit_setting_combo`, whose `field` misleadingly reads `merge_commit_allowed`), so they must be sent together. `PR_TITLE` is also the safer value on its own merits: the alternative, `COMMIT_OR_PR_TITLE`, takes the branch commit's subject on a single-commit PR and discards the PR title - observed live on a pre-flow repository, where a `main` commit carries the branch commit's wording while the PR was titled differently. This flow's plan-commit-first rule makes a single-commit PR impossible anyway, but `PR_TITLE` lands the scoped subject even if that invariant is somehow broken.
- **`squash_merge_commit_message: PR_BODY`**, because the GitHub default, `COMMIT_MESSAGES`, concatenates every branch commit message into the squash body - the plan commit and each fix commit included, which is exactly the transcript squashing exists to drop. `PR_BODY` puts the PR body there instead, and its first line is the AI disclaimer, which the commit-message convention wants in the body anyway. The body lands as GitHub composes it: unwrapped markdown, checkbox lists and all. That is the documented exception to the 72-column commit-body wrap - git's own convention, and the owner's where their instructions restate it - which governs bodies written by hand; never rewrap or trim the PR body to satisfy it.

Set both in one call, never one at a time:

```bash
gh api -X PATCH repos/{owner}/{repo} -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=PR_BODY
```

**`allow_merge_commit` or `allow_rebase_merge` reading true is worth raising with the owner.** While either is enabled, the GitHub UI offers a merge-strategy dropdown, and one absent-minded click puts a merge commit on `main` that no local rule can prevent. Leaving squash as the only enabled method makes the policy structural instead of remembered:

```bash
gh api -X PATCH repos/{owner}/{repo} -F allow_merge_commit=false -F allow_rebase_merge=false
```

## Branch protection on `main`

Part of the standard solo-repo setup, applied once per repository. It is what makes the never-push-to-`main` rule structural and a red CI check a wall rather than a warning. Check first with `gh api repos/{owner}/{repo}/branches/main/protection`; a `404 Branch not protected` means it was never set.

The protection object goes in a harness-scratchpad file, passed with `--input` - the file form matches the granted `Bash(gh:*)` pattern where an echo pipe would prompt:

```json
{"required_status_checks":{"strict":false,"contexts":["<check-run-name>","<another>"]},"enforce_admins":true,"required_pull_request_reviews":{"required_approving_review_count":0,"dismiss_stale_reviews":false,"require_code_owner_reviews":false},"restrictions":null}
```

```bash
gh api -X PUT repos/{owner}/{repo}/branches/main/protection --input <payload-file>
```

The load-bearing values in that shape, each with a trap:

- **`required_approving_review_count` must be `0`.** GitHub forbids approving your own PR, so any higher value deadlocks every PR on a solo repository permanently. Zero keeps the protection while demanding no approval - which is also why `reviewDecision` stays `""` under it, per Step 1 of `workflows/merge.md`.
- **`dismiss_stale_reviews` stays `false`, and nothing here depends on the value.** The setting dismisses *approving* reviews when a new commit is pushed - per GitHub's REST docs, approvals only - and this flow never needs an approval: the count is 0, and a round record is a COMMENT Review, which dismissal never touches and which stays in the `reviews` array regardless. It is pinned to `false` only so the protection object is fully stated and least surprising, not because `true` would break a gate.
- **`required_status_checks` can only be *introduced* by this `PUT`.** While it is `null`, `PATCH repos/{owner}/{repo}/branches/main/protection/required_status_checks` answers `404 Required status checks not enabled` instead of creating it, so the whole protection object has to be re-sent.
- **The `contexts` entries are check-run names, not workflow filenames.** They default to the workflow's job ids, not to anything written in the YAML, so read them off a real PR with `gh pr checks <pr-number>` rather than off the workflow file.
