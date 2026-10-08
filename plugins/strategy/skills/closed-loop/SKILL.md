---
name: closed-loop
description: >-
  Run a slice that exists because a review found something, through brief, brief review,
  test-first implementation, parallel reviews, adjudication, one fix round and a terminal
  verification, where every finding is fixed or accepted in this round and nothing becomes a task.
  Use when a task was filed by a review, when a task says closed-loop or Strategy-F, or when the
  user says "/strategy:closed-loop".
---

# Closed-loop

The loop is closed because no finding leaves it. The register refuses `TASK` outright, so every
finding is fixed in this round or accepted with a written rationale, and the work terminates in its
own pull request. A task filed from here would be a third level of the tree, and there is none.

Use it when the work exists because step 2, 4a, 4c or 7 of an earlier open-loop slice
deferred something. If the work
came from the plan or the spec, use [open-loop](../open-loop/SKILL.md).

Read [ledger](../ledger/SKILL.md) first: the records, the evidence each row needs, the review-round
rules and the roles. Nothing below repeats it.

## Open the records at step 1, before any code exists

```bash
S=<the strategy plugin>/skills/ledger/scripts
$S/slice-checklist.sh  new <slug> closed [--security] <dir>
$S/findings-register.sh new <slug> closed [--security] <dir>
```

## The steps

`$S/slice-checklist.sh steps closed [--security]` prints the same table.

| step | what | leaves |
| --- | --- | --- |
| 1 | Re-measure the task against `main`, write the brief, log it | brief path |
| 2 | Review the brief before any code exists | quoted verdict |
| 3 | Implement test-first, mutation-verified against an unmutated control | commit |
| 4a | Review correctness (read-only) | quoted verdict |
| 4a-s | Review the security lens (`--security` only) | quoted verdict |
| 4b | Review test quality and mutate, own worktree, fixes in place | quoted verdict |
| 4c | Independent read by the orchestrator | notes path |
| 5 | Adjudicate: reproduce every finding | the register |
| 6 | Fix the 4a and 4c findings | commit |
| 6v | Terminal verification: gates run, fixes in place, `PASS` or `FAIL` | quoted verdict |
| 9 | Gates, push, PR, merge | PR number |

Steps 1 to 6 follow the ledger's brief rules, with one addition at step 1: **the task that sent you
here may
be stale.** Later PRs fix the same areas. Check each of its claims against current `main` before
writing the brief, put each re-measured claim in the assumptions ledger ("the task said X, `main` now
does Y"), and correct the task where it lives: the issue, the task file, or the brief's first lines
when the task was a message. One task once asserted three things `main` had already fixed. The
originating finding is the task; this slice's register holds only what its own reviews find.

## Step 6v, the terminal step

Open-loop's step 7 (a second review) and step 8 (tasks) are the two steps that can create more work,
so they are gone. Without them the fix would land unchecked, so 6v replaces them: a write-capable
verifier confirms every adjudicated finding is closed, confirms the fix introduced nothing new, runs
the gates with the output pasted, and fixes in place what it finds. It may not defer and nothing
reviews it, which is what makes it terminal.

Its vocabulary is `VERDICT: PASS`, `VERDICT: PASS (N)` when it fixed N in place (N rows cite 6v), or
`VERDICT: FAIL`. `PASS` alone reconciles as zero findings; `FAIL` never reads as clean, so a failed verification cannot slip through as a clean one. 6v writes its own
argument-log round when it returns, because nothing runs after it to write one.

## Exit test

```bash
$S/pipeline-merge.sh <pr> <slug> --repo <repo> --dir <dir>
```

Open the PR, tick step 9 with its number, run the gate (it refuses an unticked row), merge, then add
the merge sha to the cell. Exit 0 and a gate comment on the PR, or the slice is not done.
There is no `--tasks` manifest: a closed slice has nothing to put in one.

## The siblings

- [open-loop](../open-loop/SKILL.md): plan-derived work, a re-review at step 7, and the only loop
  whose findings may leave as tasks.
- [orchestrator-loop](../orchestrator-loop/SKILL.md): the same findings discipline and the same 6v,
  but you write the failing tests yourself instead of a brief, so there is no step 2.
