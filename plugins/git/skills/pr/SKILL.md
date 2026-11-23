---
name: pr
description: Commit any pending work, push it and open GitHub pull requests with checked bodies, as drafts with --draft; `/pr status` reports where pull requests stand, `/pr checkout` gives one its own worktree, `/pr ready` marks a draft ready, and `/pr close` and `/pr reopen` close and reopen one. Use when asked to open, create, send, check on, check out, ready, close or reopen a pull request. Each unrelated piece of pending work gets its own branch and pull request, moved off main first. Never merges.
argument-hint: "[--draft] [status | checkout | ready | close | reopen] [<number>]"
allowed-tools:
  - Bash(git status:*)
  - Bash(git diff:*)
  - Bash(git log:*)
  - Bash(git branch:*)
  - Bash(git rev-parse:*)
  - Bash(git rev-list:*)
  - Bash(git merge-tree:*)
  - Bash(git fetch:*)
  - Bash(git push:*)
  - Bash(git stash:*)
  - Bash(git worktree:*)
  - Bash(git apply:*)
  - Bash(git ls-files:*)
  - Bash(git ls-remote:*)
  - Bash(trash:*)
  - Bash(wt:*)
  - Bash(cmp:*)
  - Bash(npx -y gh-axi:*)
  - Bash(gh pr:*)
  - Bash(gh api:*)
  - Skill
  - Read
  - Edit
  - Write
---

# PR

Commit any pending work, push it and open one pull request per unrelated piece of work. Opening
them is where this skill stops; it never merges.

GitHub calls use `npx -y gh-axi` when `npx` exists, otherwise `gh`. Without `gh`, stop and say `gh`
is needed.

## `/pr`

1. `git rev-parse --abbrev-ref HEAD` and `git status --short`.
1. On `main` with a clean tree: stop, there is nothing to send.
1. Work not committed yet, the owner's and the agent's, tracked changes and new files: group it
   into pieces of whole files. The steps of one change are one piece (a feature and its tests);
   each unrelated change, such as a README typo, is its own piece. A file holding lines of two
   pieces: stop and ask the owner how to split it. Never split a file's lines between pieces.
1. Show the plan: each piece with its branch, `<type>/<short-slug>` named after the change, and its
   commits, each step with its files. On a topic branch, the piece that matches the branch stays on
   it. On `main`, or with more than one piece, ask "Open these as N pull requests?" and wait.
   Anything but yes: stop, nothing changed.
1. Move every other piece to its own new worktree, as "Move a piece" says.
1. For each branch that got a piece, in its worktree:
   1. Commit with `/commit` (`${CLAUDE_PLUGIN_ROOT}/skills/commit/SKILL.md`, outside Claude Code
      `../commit/SKILL.md`) once per step until the worktree is clean, so each commit holds one
      step and the commit policy applies to each. In omp, moved lines show as `unrecorded` and
      copied files as the agent's, so for each step: `d = await commit.draft(repo="<path>")`,
      `await d.drop("**")`, then take only that step, `await d.take("<file>")` per file or
      `await d.take("<file>", "<unit>")` when one file holds two steps, check `await d.diff()`,
      then `await d.commit(...)`. Never `take("**")` into one commit. Repeat until a fresh draft
      has nothing left.
   1. Branch not on GitHub, or ahead of it: `git push -u origin <branch>`.
   1. Policy level `guard` or `tdd` for any path the branch changes: run the tests (see
      `${CLAUDE_PLUGIN_ROOT}/skills/commit/references/commit-policy.md`, outside Claude Code
      `../commit/references/commit-policy.md`). A failure: stop and report it.
   1. Read `git log origin/main..HEAD` and `git diff origin/main...HEAD --stat`, then draft the
      title and body to cover every commit on the branch, and check them, as the sections below
      say.
   1. Find the branch's open pull request: `npx -y gh-axi pr list --head <branch>`, or
      `gh pr list --head <branch> --state open --json number`. One exists: rewrite its title and
      body with `npx -y gh-axi pr edit <n> --title "<subject>" --body-file /tmp/pr-body.md`, or
      `gh pr edit` with the same flags, and report its number and what changed in the title and
      body. Never open a second pull request for the branch. None: open one, as a draft with
      `--draft`. `--draft` never changes an existing pull request's draft state.

## Move a piece

The source is the folder the work is in. The new worktree's base is the current commit on `main`
and `origin/main` from a topic branch: `wt switch --create <branch> --base <base> --no-cd` when
`command -v wt` succeeds, otherwise `git worktree add -b <branch> <path> <base>`. `<path>` is the
new folder `git worktree list` shows. Never `git switch -c` then back.

Outside omp, when all the work on `main` is one piece:

1. `git stash push --include-untracked`.
1. Create the worktree.
1. `git -C <path> stash pop`. If it fails, report it and stop; the stash still holds the work.

Otherwise, and always in omp, where `git stash`, `git reset`, `git restore`,
`git checkout -- <path>`, `git add` and `git commit` are not allowed:

1. `git diff --binary HEAD -- <piece's tracked files> > <tmp>/p.patch`, with `<tmp>` outside the
   repository. `git ls-files --others --exclude-standard` lists the new files.
1. Create the worktree.
1. `git -C <path> apply --binary <tmp>/p.patch`, and copy each of the piece's new files to the same
   relative path in `<path>`.
1. Check the worktree: each of the piece's files is identical to the source's (`cmp`), and a file
   the piece deletes is gone from both.
1. Only then, in the source: `git apply -R --binary <tmp>/p.patch` and `trash` the piece's new
   files. `git status --porcelain` lists none of the piece's files.

Any failure before the reverse: stop and report it. The source is still untouched.

## `/pr status [<number>]`

`status` is a keyword: `/pr status` reports even when a branch is named `status`. It only reads:
it never commits, pushes or edits.

Without `gh`, say it is needed and show only the local state. Otherwise `git fetch origin`, then
take, without a number, every open pull request whose branch has a local branch or worktree
(`gh pr list --state open --json number,headRefName`), plus the current branch's pull request;
with a number, only that one. Read each with `gh pr view <n> --json
number,title,state,isDraft,headRefName,baseRefName,statusCheckRollup,reviewDecision,mergeable,mergeStateStatus,commits`,
and its review threads and last body edit with `gh api graphql`:

```
query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){
  lastEditedAt createdAt
  reviewThreads(first:100){nodes{isResolved comments(first:1){nodes{author{login}}}}}}}}
```

Write one block per pull request, in plain words:

- State (open, draft, merged or closed), title, branch, and its worktree path if it has one.
- Checks: passed, running or failed, naming each failed check.
- Review: approved, changes requested or none, and how many review threads are unresolved and
  who opened them.
- Mergeable: clean, conflicts or blocked, and why. GitHub does not list conflicting files; list
  them with `git merge-tree --write-tree --name-only origin/<base> origin/<branch>`.
- Base: how many commits it is behind `origin/<base>` (`git rev-list --count
  origin/<branch>..origin/<base>`). When the base is another pull request's branch, it is
  stacked: name that pull request and its state.
- Local: files not committed in its worktree, commits not pushed, and commits on GitHub not
  pulled.
- Description: out of date when a commit on the branch is newer than the last body edit
  (`lastEditedAt`, or `createdAt` when the body was never edited).
- Next step, one line: "Run /merge", "Run /worktree catchup <name>", "Answer 3 review threads",
  "Fix the failed check <name>", "Commit and run /pr", "Run /pr to update the description",
  "Wait for checks" or "Waits on #7".

## `/pr checkout [<number>]`

`checkout` is a keyword: `/pr checkout` gives a pull request its own worktree even when a branch is
named `checkout`. It never switches branches in the current folder.

1. Without a number, list the open pull requests (number, title, branch, author) and ask which.
1. A worktree already has the pull request's branch (`git worktree list`): that is `<path>`; skip
   to the move.
1. `git fetch origin`. The branch is in this repository and `command -v wt` succeeds:
   `wt switch <branch> --no-cd`. Otherwise, as for a pull request from a fork,
   `git worktree add --detach <path> origin/<base>`, with `<path>` where `wt` puts worktrees (the
   layout `wt list` or `git worktree list` shows), then `gh pr checkout <n>` inside `<path>`, which
   sets the push remote.
1. Record the base as `/worktree` does: `git config branch.<branch>.base origin/<base>` and
   `git config branch.<branch>.baseTip $(git merge-base <branch> origin/<base>)`.
1. Move the session into `<path>`, so everything after this works on the pull request's branch
   there. No harness lets the agent move its own session into a sibling folder:
   - omp: only the owner can, with `/move <path>` (or `!cd <path>`); ask them to. Until they do,
     give every bash call `cwd: <path>` and every file tool a path under `<path>`.
   - Claude Code: a `cd` outside the project folder is reset after the command, and
     `EnterWorktree` only enters `.claude/worktrees/`. Start every Bash command with
     `cd <path> &&` and give every file tool a path under `<path>`.
   - Codex: give every command `<path>` as its working folder and every edit a path under it.

   Tell the owner the path and that every later command and edit runs there.
1. Print the pull request's `/pr status` block.

## `/pr close [<number>]`

`close` is a keyword: `/pr close` closes a pull request even when a branch is named `close`.
GitHub cannot delete a pull request, only close it.

1. Without a number, take the open pull request of the current branch. None: stop and say so.
1. Show its number, title and branch, and ask for a reason, which is optional.
1. `npx -y gh-axi pr close <number>`, adding the reason as a comment when one was given, or
   `gh pr close <number> --comment "<reason>"` without `npx`.

Close the pull request and nothing else: its branch, on GitHub and local, and its worktree stay.

## `/pr reopen [<number>]`

`reopen` is a keyword: `/pr reopen` reopens a pull request even when a branch is named `reopen`.

1. Without a number, take the current branch's closed pull request. None: list this repository's
   closed pull requests that were not merged (number, title, branch, closed date) and ask which.
1. Merged: say a merged pull request cannot be reopened, and stop.
1. Its branch is gone from GitHub (`git ls-remote --heads origin <branch>` prints nothing): GitHub
   cannot reopen it, so say so. With a local copy of the branch, offer to push it back
   (`git push -u origin <branch>`) and continue on yes; without one, stop.
1. Show its number, title and branch, and ask for a reason, which is optional.
1. `npx -y gh-axi pr reopen <number>`, adding the reason as a comment when one was given, or
   `gh pr reopen <number> --comment "<reason>"` without `npx`.
1. Print the pull request's `/pr status` block.

## `/pr ready [<number>]`

`ready` is a keyword: `/pr ready` marks a pull request ready even when a branch is named `ready`.

1. Without a number, take the current branch's open pull request. None: stop and say so.
1. Not a draft (`isDraft` false in `gh pr view <n> --json isDraft`): say it is already ready for
   review, and stop.
1. `npx -y gh-axi pr ready <number>`, or `gh pr ready <number>` without `npx`.
1. Print the pull request's `/pr status` block.

## Pull request body template

Write all five sections, in this order, into a body file such as `/tmp/pr-body.md`. A sentence or
two under each heading is enough. The body should read for a high schooler: plain words, short
sentences, every piece of shorthand defined where it first appears.

```
## Context

## Summary

## How it was verified

## Effect of merging

## Review guide
```

- `## Context` says why the change exists: the problem and what prompted it. Two short paragraphs at
  most, with any shorthand defined where it first appears.
- `## Summary` says what changed: up to five short bullets, each one self-contained, so deleting
  any bullet strips no context another bullet needs. Name key files by path. Add a `## What changed`
  section only when the pull request is too large for `## Summary` to carry it.
- `## How it was verified` lists the commands that were run and what they reported. Evidence, never
  "should work".
- `## Effect of merging` says what merging does and what it does not do, including whether anything
  changes on a live machine.
- `## Review guide` is triage, not enumeration: the reading order, which files are load-bearing and
  which are mechanical churn, a behavioral note per load-bearing file, and where a second pair of
  eyes helps most. On a small pull request one or two lines is the right length. It never describes
  how the change was produced internally.

## Check the draft before posting

Re-read the body and fix everything the two lists below catch, then read it once more.

Structure:

- All five headings are present, spelled exactly as above, in that order.
- Every `## Summary` bullet stands alone.
- `## How it was verified` names real commands and real results.

Writing that sounds machine-made:

- Each sentence adds a fact. Cut a sentence that only repeats the one before it, including a short
  closing line that sums up the paragraph.
- State the point. No "not X but Y" or "rather than X" unless someone actually believed X.
- Start with the fact, not a run-up: no "Here's what changed", "The key part is", "Note that".
- List as many items as there are. Never pad to three.
- No dashes joining clauses (`—`, `–`, ` -- `). Use a period, a comma or a colon. Dashes inside
  code, paths and commands stay.
- Plain words: "is", "has", "uses", never "serves as", "boasts" or "leverages". None of robust,
  comprehensive, seamless, crucial, pivotal, key, enhance, delve, showcase, underscore.
- No credit to unnamed sources ("best practice says", "it is widely known"). Name the source or
  drop the claim.
- No bold labels at the start of list items, no emojis, no arrows as decoration.
- No chat leftovers: "I hope this helps", "let me know", "Great question".
- Write about the change, never about this text or how it was produced.
- Address the reader directly. "See `src/a.ts` first" is fine; "a reviewer will find" is not.

## Open the pull request

Only once the check above passes:

```
npx -y gh-axi pr create --title "<subject>" --body-file /tmp/pr-body.md
```

or `gh pr create` with the same flags, adding `--draft` for `/pr --draft`. The title follows the
repository's commit message style. Pass the body with `--body-file`, never inline, which mangles
newlines. Report the number and URL, and whether it is a draft.

## Safeguards

- Never post an unchecked body.
- Never push to `main`. A force-push is `--force-with-lease`, never `--force`.
- If a hook rejects a commit or push, report its output and stop. Never `--no-verify`.
- Never merge, and never turn on auto-merge.
