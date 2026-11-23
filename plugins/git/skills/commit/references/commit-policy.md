# Commit policy

A repository decides how strictly its commits are tested in `.agents/commit-policy`, a file
committed in the repository itself. `commit`, `amend`, `pr` and `worktree` read it.

## The file

```
conventional-commits = on
*  guard
dot_config/nvim/**  tdd
```

- A rule line is `<path pattern>  <level>`. `*` matches every path and `<folder>/**` matches
  everything under a folder. The last line that matches a path wins, so put the broad line first
  and the folder lines below it.
- A settings line is `<name> = <value>`.
- No file, or no rule line matching a path, means `tdd`.

## Levels

| Level | A commit at this level |
| --- | --- |
| `tdd` | New code comes with its test. The test was seen failing first and is committed together with the code. All tests pass. |
| `guard` | Existing tests pass. No new test is required. |
| `off` | No test is checked. |

A commit touching paths at different levels takes the strictest of them: `tdd` over `guard` over
`off`.

## Settings

- `conventional-commits = off` turns Conventional Commits off; with no such line it is on.
- On: messages follow `${CLAUDE_PLUGIN_ROOT}/skills/conventional-commits/SKILL.md` (outside Claude
  Code, `../../conventional-commits/SKILL.md` from this file).
- Off: the subject is a plain imperative sentence, such as `Add the export button`.

## Finding the test command

Look in this order and take the first that names one: the repository's `AGENTS.md`, `justfile`,
`Makefile`, `package.json`, `Cargo.toml`, `Package.swift`, `go.mod`.

None found at `guard` or `tdd`: commit anyway and report "No tests found in this repo; nothing was
checked."

## Running the tests

Tests never run inside `git rebase -x` or a git hook; a test suite run that way once re-initialised
the real repository as bare. Run them from the worktree, or from a temporary detached worktree,
with `GIT_DIR`, `GIT_WORK_TREE` and `GIT_INDEX_FILE` unset:

```
env -u GIT_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE <test command>
```

## The `tdd` check

Run it on the files about to be committed (staged, or selected in omp's `commit` draft).

1. `git worktree add --detach "$(mktemp -d)/check" HEAD`; call that folder `<tmp>`.
1. Copy only the commit's test files into `<tmp>` and run the tests there. They must fail.
1. Copy the commit's other files in too and run the tests again. They must pass.
1. `git worktree remove --force <tmp>`.

If the tests passed without the code, refuse: the test does not check the new behavior. If they
failed with the code, refuse: the code does not pass its test. Say which one happened.

Outside `commit` (an amend, a catch-up, a pull request), `tdd` and `guard` both mean the tests run
and pass.
