---
name: open-loop
description: >-
  Run a slice of plan- or spec-derived work through the full pipeline (brief, brief review,
  test-first implementation, parallel reviews, adjudication, one fix round, one re-review, tasks,
  merge), where a finding may leave as a task that outlives the pull request. Use when work starts
  from a plan or spec, when a task says open-loop or Strategy-A, or when the user says
  "/strategy:open-loop".
---

# Open-loop

The loop is open because a finding can leave it: this is the only loop whose register accepts
`TASK #<n>`. Its tasks run under [closed-loop](../closed-loop/SKILL.md), which refuses tasks of its
own, so the tree is exactly two levels deep and finite.

Use it when the work came from the plan or the spec. If the work exists because an earlier review
found something, use closed-loop. Decide at the moment the task is written and say which in the task.

Read [ledger](../ledger/SKILL.md) first: the records, the evidence each row needs, the review-round
rules and the roles. Nothing below repeats it.

## Open the records at step 1, before any code exists

```bash
S=../ledger/scripts
$S/slice-checklist.sh  new <slug> open [--security] <dir>
$S/findings-register.sh new <slug> open [--security] <dir>
```

## The steps

`$S/slice-checklist.sh steps open [--security]` prints the same table.

| step | what | leaves |
| --- | --- | --- |
| 1 | Read the plan and the spec, write the brief, log it | brief path |
| 2 | Review the brief before any code exists | quoted verdict |
| 3 | Implement test-first, mutation-verified against an unmutated control | commit |
| 4a | Review correctness (read-only) | quoted verdict |
| 4a-s | Review the security lens (`--security` only) | quoted verdict |
| 4b | Review test quality and mutate, own worktree, fixes in place | quoted verdict |
| 4c | Independent read by the orchestrator | notes path |
| 5 | Adjudicate: reproduce every finding | the register |
| 6 | Fix the 4a and 4c findings | commit |
| 7 | Re-review the fix, exactly once | quoted verdict |
| 8 | Open findings become tasks | task numbers, or `none` |
| 9 | Gates, push, PR, merge | PR number |

**Step 1 and step 3 never happen in one action.** The logged brief is what creates the gap step 2 runs
in. The brief is a hypothesis: step 2 re-measures every file and line it cites with
`git show origin/main:<path> | grep -n` and says where it is wrong, so nobody builds against a stale
address.

**Step 3 ships a differential test** when the slice models an external tool's behavior: run a corpus
through the real binary and assert the two readings match. Where the real tool can be asked instead of
modelled, ask it and skip the problem.

**Step 7 runs once.** A second fix round does not earn a second review; what step 7 still finds is
adjudicated at step 8 like any other finding. That bound, plus the register's deferral rules, is what
makes this loop terminate.

## Step 8: what may leave as a task

The register decides mechanically: only a `MEDIUM` or `LOW` finding from step 2, 4a, 4c or 7 may take
`TASK #<n>`. Everything else (`CRITICAL` or `HIGH` anywhere, any security finding, any test-quality
finding) is fixed in this round or accepted with a written rationale. A line being in this diff does
not by itself force the fix into this round; if it did, nothing could ever reach step 8.

Every task filed carries its scheduling decision (can it wait, or must it land next) and its number
goes in the `--tasks` manifest, or the gate fails. Nothing is demoted to a PR comment. Adjudicate at
step 5 first: reproduce the finding before accepting or deferring it.

## Exit test

```bash
$S/pipeline-merge.sh <pr> <slug> --repo <repo> --dir <dir> [--tasks <file>]
```

Exit 0 and a gate comment on the PR, or the slice is not done.

## The siblings

- [closed-loop](../closed-loop/SKILL.md): the same steps 1 to 6, then terminal verification 6v
  instead of 7 and 8; no finding leaves. For work a review created.
- [orchestrator-loop](../orchestrator-loop/SKILL.md): you write the failing tests yourself instead
  of a brief; closed on the findings axis. For behavior that can be stated as a test before a
  paragraph.
