---
name: orchestrator-loop
description: >-
  Run a slice where the orchestrator writes the failing tests and the seams itself instead of a
  prose brief, an implementer makes them green, parallel reviews and a terminal verification follow,
  and every finding is fixed or accepted in this round. Use when the behavior can be stated as a
  failing test before it can be stated as a paragraph, when a task says orchestrator-loop or
  Strategy-B, or when the user says "/strategy:orchestrator-loop".
---

# Orchestrator-loop

You are inside the loop. In the other two loops you write a brief and hand it to an implementer;
here you write the failing tests and the trait seams yourself, and those tests are the
specification. There is no prose brief and no brief review, because a concrete failing test says what
a paragraph only gestures at.

That is the only difference from [closed-loop](../closed-loop/SKILL.md). On the findings axis this
loop is closed too: the register refuses `TASK`, every finding is fixed or accepted in this round, and
6v is terminal. Choosing between the two is only a question of who writes the tests.

Use it when the behavior can be stated as a test first. If you find yourself writing a paragraph of
instructions for an implementer, you are running open-loop; say so and switch.

Read [ledger](../ledger/SKILL.md) first: the records, the evidence each row needs, the review-round
rules and the roles. Nothing below repeats it.

## Open the records before the first test exists

```bash
S=<the strategy plugin>/skills/ledger/scripts
$S/slice-checklist.sh  new <slug> orchestrator [--security] <dir>
$S/findings-register.sh new <slug> orchestrator [--security] <dir>
```

## The steps

`$S/slice-checklist.sh steps orchestrator [--security]` prints the same table. There is no step 2:
the table omits it rather than making you record a deviation for a review that was never meant to run.

| step | what | leaves |
| --- | --- | --- |
| 1 | Write the failing tests and the seams, commit red | commit |
| 3 | Implement test-first, mutation-verified against an unmutated control | commit |
| 4a | Review correctness (read-only) | quoted verdict |
| 4a-s | Review the security lens (`--security` only) | quoted verdict |
| 4b | Review test quality and mutate, own worktree, fixes in place | quoted verdict |
| 4c | Independent read by the orchestrator | notes path |
| 5 | Adjudicate: reproduce every finding | the register |
| 6 | Fix the 4a and 4c findings | commit |
| 6v | Terminal verification: gates run, fixes in place, `PASS` or `FAIL` | quoted verdict |
| 9 | Gates, push, PR, merge | PR number |

**Confirm the assumptions ledger before writing red.** Here a wrong assumption does not become a
wrong paragraph; it becomes a wrong test that then passes.

**Step 1's evidence is the red commit.** The tests must fail on it for the reason the slice exists,
not for a missing import: run them once and keep the failure output beside the ledgers.

**Step 3's implementer gets the tests, the argument log and nothing to decide about scope.** Where an
original implementation exists it also ships a differential check against it.

**Findings land before the next slice starts.** Independent slices may run in parallel, each with its
own records; nothing carries over between them.

## The testing charter

Hand this to the implementer with the tests. Hard-to-test code is a design signal, not a testing
problem.

1. Test through the public interface only. Never make something public, or reach into a private
   piece, to make a test easier.
2. Push the public interface toward values where that is honest: values in, plan out. Then a test
   with zero doubles is a front-door test.
3. Where the public behavior is an effect, spy on it at the boundary: record what crossed the seam
   and assert on that. Feed inputs through thin one-method stubs.
4. The double's complexity measures how badly the boundary sits: zero doubles, then a spy, then a
   thin stub, then a behavioral fake, worst last. Needing a fake with logic in it means stop and
   reconsider the boundary: could a value be handed in, could the trait be narrower? Record the
   decision either way.

Small in-scope seam refactors are allowed mid-slice, test-covered before the feature lands on them,
and noted in the argument log. The outer tests that drive the real binary stay: a fully tested pure
core with an untested composition root has been measured to survive that root's whole body being
replaced by a constant.

## Budget

Forecast each step before starting, as [ledger](../ledger/SKILL.md) says under Bounds; this loop has
no brief steps, so those numbers fall away. Re-forecast against the measured numbers as they arrive.
Review time scales with charter breadth and diff size, so a narrow charter on a small diff is minutes,
not an hour. Twice the forecast stops the step: record the deviation and move on.

## Exit test

```bash
$S/pipeline-merge.sh <pr> <slug> --repo <repo> --dir <dir>
```

Open the PR, tick step 9 with its number, run the gate (it refuses an unticked row), merge, then add
the merge sha to the cell. Exit 0 and a gate comment on the PR, or the slice is not done.

## The siblings

- [open-loop](../open-loop/SKILL.md): a written brief reviewed before any code, a re-review at step
  7, and the only loop whose findings may leave as tasks.
- [closed-loop](../closed-loop/SKILL.md): the same findings discipline and the same 6v, with you
  back outside the loop: a real brief at step 1 and a real brief review at step 2.
