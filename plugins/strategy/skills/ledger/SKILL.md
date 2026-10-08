---
name: ledger
description: >-
  The records every strategy slice keeps (the step checklist, the findings register, the argument
  log, the assumptions ledger), the scripts that create and verify them, and the rules a review round
  follows so its evidence counts. Read it whenever a slice runs under open-loop, closed-loop or
  orchestrator-loop, when a checklist or register must be opened, ticked or verified, when a review
  verdict or a finding has to be recorded, or before merging a slice PR.
---

# Ledger

A slice is one unit of work that goes from brief to merged pull request through fixed steps. Two
verified records prove it did: the **checklist** proves every step ran, the **register** proves every
review finding was resolved. Two unverified records carry the reasoning: the **argument log** and the
**assumptions ledger**. "Done" is `pipeline-merge.sh` exiting 0, never a feeling.

The scripts are the contract. Where this page and a script disagree, the script wins, because the
script is what refuses the merge. `scripts/self-check.sh` proves the verifiers can pass and fail.

## Commands

```bash
S=<this skill's folder>/scripts        # ../ledger/scripts from a sibling loop skill

$S/slice-checklist.sh  new <slug> <open|closed|orchestrator> [--security] [dir]
$S/findings-register.sh new <slug> <open|closed|orchestrator> [--security] [dir]
$S/slice-checklist.sh  steps <loop> [--security]            # print the step table
$S/slice-checklist.sh  verify <dir>/checklist-<slug>.md --repo <repo>
$S/findings-register.sh verify <dir>/findings-<slug>.md --repo <repo> [--tasks <file>]
$S/pipeline-merge.sh   <pr> <slug> --repo <repo> --dir <dir> [--tasks <file>]
```

`new` refuses to overwrite: a second `new` on a slug is an error, not a reset. `--security` adds step
4a-s, the security review; pass it when the slice touches authentication, credentials, secrets, a
privilege boundary or untrusted input. All records live in one directory per slice (`checklist-`,
`findings-`, `argument-`, `assumptions-` and `brief-<slug>.md`, plus the review outputs), outside the
repository's tracked tree unless the project tracks them.

## The checklist

One row per step: `| done | step | what | kind | evidence |`. Tick a box `[x]` only when the evidence
names something that exists; the verifier resolves it instead of pattern-matching its shape, because a
checklist of invented references once printed "clear to merge".

| kind | the evidence must contain | checked by |
| --- | --- | --- |
| `commit` | a 7 to 40 character hex sha, first in the cell (a test-first step cites the green commit; the red one precedes it on the branch) | `git cat-file -e <sha>^{commit}` in `--repo` |
| `path` | a path (`/`, or ending `.md`, `.txt`, `.sh`) | the file exists, relative to the ledger dir or absolute |
| `verdict` | the reviewer's own words with `VERDICT:`, `NO_ISSUE`, `NEW_ISSUE` or `INCOMPLETE` | the token is present |
| `text` | anything non-empty (task numbers, `none`, a PR number) | non-empty |

A review step must quote the verdict because quoting forces reading: a HIGH defect once merged behind
a completed review nobody opened. An agent id, a transcript id or the word "clean" alone is rejected.
The verdict line is `VERDICT: NO_ISSUE` or `VERDICT: NEW_ISSUE (N)`, N the rows in the review's
findings table; 6v writes `VERDICT: PASS`, `VERDICT: PASS (N)` when it fixed N in place, or
`VERDICT: FAIL`. No cell contains `|`.

A step may be skipped only as a **deviation**: mark the box `[DEV]`, write the reason in its evidence
cell, and repeat the reason as a line under `## Deviations` that names the step. A `[DEV]` with an
empty evidence cell fails exactly like an unticked box. A missing row fails too. A fix step with
nothing to fix is recorded the same way, reason `nothing to fix`: a clean round is the expected one,
and the deviation only says that the commit the row would cite does not exist.

## The register

Columns: `| id | step | severity | summary | disposition | evidence |`. Rows start with `| F` (`F1`,
`F2`, ...); a row numbered `| 1 |` is invisible to the verifier and the finding evaporates. The `F0`
row whose summary says "delete this row" is the example and is skipped. Severity is exactly one of
`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`. Disposition is exactly one of:

| disposition | the evidence the verifier demands |
| --- | --- |
| `FIXED` | a commit that resolves, a named test (`test/...`, `*.sh`, `*.rs`, `test some_name`, `test "a sentence"`), and the literal `RED ... GREEN` (a behavior defect closed) or `SURVIVED ... KILLED` (a test that could not fail now can) |
| `FIXED-NOTEST` | a commit that resolves and why no test can close it (`no test`, `untestable`, `cannot be tested`, `measured`); if a test can be written the disposition is FIXED. A step 2 finding is fixed in the brief, so its row cites the brief's path instead of a commit |
| `ACCEPTED` | the written rationale for leaving it |
| `TASK #<n>` | the finding leaves as future work; a line of the `--tasks` manifest starts with `#n`, and the manifest is required as soon as one row defers |

`TASK` is refused, with the reason printed, when fixing now is the only honest answer: under the
closed and orchestrator loops (every finding is fixed or accepted in this round), for any `4a-s` row
(security, at any severity), for any `4b` row (test quality; 4b fixes in place), and for `CRITICAL` or
`HIGH` at any step. What may defer is therefore exactly: an open-loop `MEDIUM` or `LOW` finding from
step 2, 4a, 4c or 7.

The **Declared verdicts** table quotes each review step's verdict as returned. The verifier reads a
count out of it (the first `(N)`, otherwise the first `N finding`, otherwise zero for `CLEAN`,
`NO_ISSUE` or `VERDICT: PASS`, so `VERDICT: PASS (1)` reads 1) and compares it with the rows that
cite the step. `FINDINGS (5)` against three
rows means two findings vanished on the way to the ledger, and the gate says so. `FAIL` never reads as
zero. `n/a` means the review did not run, and then no row may cite it. A verdict it cannot read fails,
so carry the count beside prose (`3 findings`).

Deferring at least as many findings as you fix prints an OVER-DEFERRAL warning. Loud, not fatal:
explain it in the PR body.

## The argument log

Each adjudication appends to `argument-<slug>.md` in the same directory. No script creates or reads
it; the first append creates it. It holds identifiers and reasoning only, because the verdict, the
critique and the proof already live in the reviewer's output and the register, and a second copy can
disagree with the first:

```markdown
## Round <n>, step <2|5|7|6v>

Reviewer outputs: <paths>. Dispositions and evidence: `findings-<slug>.md`.

- F<n>: <why it holds, why it does not, or why it can wait, in your own words>
```

Write it at every adjudication, terminal ones included (step 2 when its verdict returns, step 5 for
the 4a/4a-s/4b/4c rounds, step 7 or 6v when it returns). Read every entry before every dispatch and
every retry: an implementer, reviewer or verifier is a fresh agent that remembers nothing, and a retry
replaces a run that argued something nobody else recorded. Skipping the read is how a later round
re-litigates round one.

## The assumptions ledger

Before the brief, and before asking anything, write down what the tree already answers as one numbered
batch, each line with its source (`path:line`, a spec section, a plan line, a convention), measured
with `git show origin/main:<path> | grep -n` (`main` when the repository has no remote), never a
working copy:

```markdown
## Assumptions ledger

Confirm all, or name the numbers to change. Anything you do not name I treat as confirmed.

1. <assumption>, source: <where it came from>
```

An assumption with no source is a question; ask it instead. A rejected assumption becomes one question
at a time, naming what it changes. Present the ledger once. When nobody can answer (an unattended
run), a sourced assumption counts as confirmed and an unsourced one is recorded as a guess; say so
under the checklist's `## Deviations`. No script reads it. This ledger and the
argument log are adapted from chaseai-yt/claudex-loop (MIT).

## The brief

Open-loop and closed-loop start with a brief (`brief-<slug>.md`): what changes, where, which tests
prove it, which gates run. **Step 1 and step 3 never happen in one action.** The logged brief is what
creates the gap step 2 runs in. The brief is a hypothesis: step 2 re-measures every file and line it
cites with `git show origin/main:<path> | grep -n` (`main` without a remote) and says where it is
wrong, so nobody builds against a stale address. A step 2 finding is fixed in the brief itself before
step 3 and recorded `FIXED-NOTEST` with the brief's path. **Step 3 ships a differential test** when
the slice models an external tool's behavior: run a corpus through the real binary and assert the two
readings match. Where the real tool can be asked instead of modelled, ask it and skip the problem.

## Rules every review round follows

These are what make a register row worth recording.

- **Scope is the slice's own diff.** Every review charter names the diff (`git diff
  origin/main...HEAD`, or `main...HEAD` without a remote) and requires each finding to anchor to a
  line it added or changed. A line the slice rewrites is in scope whole, old defects on it included.
  Step 2 reviews prose, so its findings anchor to the brief's items. Code the
  slice merely calls is out of scope unless the slice made it reachable or worse; a widened
  pre-existing defect is in scope only up to the widening, and the remedy restores the pre-slice blast
  radius, no more. An out-of-scope defect goes in a separate "observed, out of scope" section with no
  disposition and never enters the register.
- **4a and 4b run in parallel in separate worktrees.** 4b mutates production code; sharing a worktree
  produces false SURVIVED results, which read as coverage gaps and send the next round after a hole
  that does not exist. 4b's worktree branch is merged into the slice branch before step 5.
- **4b uses a named mutation list and an unmutated control.** Attempt at least: revert the fix itself;
  weaken each guard's precision rather than deleting it; delete a message or status while leaving
  behavior intact; replace a helper with the naive version a future editor would write; break each
  exemption and confirm the clean fixtures fail. Report a table of mutation, outcome and the assertion
  that killed it. A kill with no named assertion is not a kill. The control run proves the harness can
  tell mutants apart at all. Step 3's own mutation check is the control and revert-the-fix; 4b runs
  the named list and repeats neither.
- **Code quality is reported separately and ranked below correctness** in every charter, so a
  structure nit never outranks a missed defect. It is adjudicated the same way: fixed, or accepted
  with a rationale.
- **Every fixer (steps 3, 4b, 6, 6v) answers in writing, in the argument log under its step:** does
  anything I added admit the state I was fixing, or its
  mirror, or assert something I did not measure? When a fix replaces a check rather than adding one,
  list what the old check caught that the new one does not.
- **Step 5 reproduces a finding on the commit it was found on.** A 4b finding is already fixed when
  it reaches adjudication; reproduce it against the commit 4b started from (`SURVIVED` there,
  `KILLED` on the fix), not against the branch head, where it cannot show.
- **A review is one pass over the diff.** It ends when every added or changed line has been read
  against the charter, and its output is one findings table plus the verdict line, about a screen.
  Other interpreter versions, locales, fuzzing and probe scripts are out of scope unless the brief
  names them as a contract; a reviewer that wants them writes one line in the out-of-scope section
  and moves on. An eval run spent fifty minutes on the first review of a one-line change this way.

## Bounds

A slice has a length, and the length is written down before the work starts, because "make it
correct" has no natural end.

- **Forecast every step** in the argument log before step 1, in whole minutes. A typical multi-agent
  slice: brief 10, brief review 10, failing tests 10, implement 15, each review 15 (they run in
  parallel), 4c 5, adjudication 5, fixes 10, re-review or 6v 5, tasks 2, push and merge 12. A change
  under twenty production lines (test lines not counted) takes about a tenth of that, rounded up to a
  minute, and one agent runs the parallel steps in sequence, so its forecast is their sum. Write the
  actual beside each forecast as the step ends. A step starts when the previous one ends and includes
  its own bookkeeping (ticking the row, writing the log); reading the skills and the repository before
  step 1 is no step and is not forecast.
- **Twice the forecast stops the step.** Record what was done and what was not as a `[DEV]` with the
  reason, and move on; the checklist accepts the deviation and the next step reads it. Never extend a
  step because it feels nearly finished. Stopping means handing on what exists: a half-written brief
  goes to step 2 as it stands and step 2 says what is missing. The clock is wall time; a stall is part
  of the reason, not a pause.
- **Every step runs once.** Dispatch each step exactly once; a second fix round earns no second
  review; 6v and step 7 are terminal.

## Who runs each step

Roles, not models; use whatever agents your harness provides.

- The **orchestrator** (you) runs 1, 4c, 5, 8 and 9, and writes every record.
- An **implementer** (a fresh write-capable agent) runs 3 and 6, with the argument log in its brief.
- A **reviewer** (read-only) runs 2, 4a, 4a-s and 7. The security lens goes to a reviewer that is
  allowed to discuss credentials and authentication; some runtimes refuse that subject outright.
- A **write-capable reviewer** runs 4b and 6v, because both fix in place.

Whoever wrote the code never reviews it. Dispatch each step exactly once, and check for an agent
already on it first; two agents on one step race the worktree. Once 4b is dispatched the implementer is
done: route any late refinement to 4b. Retry a failed reviewer once, then substitute a write-capable
agent and record the deviation. "The run died" needs positive evidence: an error marker, a refusal
string, or a process exit plus an empty output on a second check after a settling delay.

**One agent, every role.** When no agent can be dispatched, play the roles in sequence: write each
review as its own section with its charter at the top and the verdict line at the bottom, treat each
as one pass over the diff, and record a single deviation ("self-review: one agent held every role")
under `## Deviations`. The verifiers accept that; what they do not accept is a review that never
ends.

## Merging

Gates are the project's own checks (tests, lint, format), named in the brief and run with the output
quoted at 6v or step 7 and again before the merge. The verifiers check the records:
`pipeline-merge.sh` runs both, refuses on either, and on success posts their output as a
comment on the PR and prints the merge command. It never merges for you. The comment is the artifact:
a PR merged around the gate is visible afterwards by carrying none. The command is a merge commit,
not a squash, so every sha the records cite stays on `main` and the verifiers can be rerun from a
clone.
