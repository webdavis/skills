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
privilege boundary or untrusted input. All four records live in one directory per slice, outside the
repository's tracked tree unless the project tracks them.

## The checklist

One row per step: `| done | step | what | kind | evidence |`. Tick a box `[x]` only when the evidence
names something that exists; the verifier resolves it instead of pattern-matching its shape, because a
checklist of invented references once printed "clear to merge".

| kind | the evidence must contain | checked by |
| --- | --- | --- |
| `commit` | a 7 to 40 character hex sha | `git cat-file -e <sha>^{commit}` in `--repo` |
| `path` | a path (`/`, or ending `.md`, `.txt`, `.sh`) | the file exists, relative to the ledger dir or absolute |
| `verdict` | the reviewer's own words with `VERDICT:`, `NO_ISSUE`, `NEW_ISSUE` or `INCOMPLETE` | the token is present |
| `text` | anything non-empty (task numbers, `none`, a PR number) | non-empty |

A review step must quote the verdict because quoting forces reading: a HIGH defect once merged behind
a completed review nobody opened. An agent id, a transcript id or the word "clean" alone is rejected.

A step may be skipped only as a **deviation**: mark the box `[DEV]`, write the reason in its evidence
cell, and repeat the reason as a line under `## Deviations` that names the step. A `[DEV]` with an
empty evidence cell fails exactly like an unticked box. A missing row fails too.

## The register

Columns: `| id | step | severity | summary | disposition | evidence |`. Rows start with `| F` (`F1`,
`F2`, ...); a row numbered `| 1 |` is invisible to the verifier and the finding evaporates. The `F0`
row whose summary says "delete this row" is the example and is skipped. Severity is exactly one of
`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`. Disposition is exactly one of:

| disposition | the evidence the verifier demands |
| --- | --- |
| `FIXED` | a commit that resolves, a named test (`test/...`, `*.sh`, `*.rs`, `test some_name`, `test "a sentence"`), and the literal `RED ... GREEN` (a behavior defect closed) or `SURVIVED ... KILLED` (a test that could not fail now can) |
| `FIXED-NOTEST` | a commit that resolves and why no test can close it (`no test`, `untestable`, `cannot be tested`, `measured`); if a test can be written the disposition is FIXED |
| `ACCEPTED` | the written rationale for leaving it |
| `TASK #<n>` | the finding leaves as future work; `n` must appear in the `--tasks` manifest, and the manifest is required as soon as one row defers |

`TASK` is refused, with the reason printed, when fixing now is the only honest answer: under the
closed and orchestrator loops (every finding is fixed or accepted in this round), for any `4a-s` row
(security, at any severity), for any `4b` row (test quality; 4b fixes in place), and for `CRITICAL` or
`HIGH` at any step. What may defer is therefore exactly: an open-loop `MEDIUM` or `LOW` finding from
step 2, 4a, 4c or 7.

The **Declared verdicts** table quotes each review step's verdict as returned. The verifier reads a
count out of it (`CLEAN`, `NO_ISSUE` or `VERDICT: PASS` is zero; otherwise the first `(N)`, otherwise
the first `N finding`) and compares it with the rows that cite the step. `FINDINGS (5)` against three
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
## Round <n>, step <2|4a|4a-s|4b|7|6v>

Reviewer output: <path>. Dispositions and evidence: `findings-<slug>.md`.

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
with `git show origin/main:<path> | grep -n`, never a working copy:

```markdown
## Assumptions ledger

Confirm all, or name the numbers to change. Anything you do not name I treat as confirmed.

1. <assumption>, source: <where it came from>
```

An assumption with no source is a question; ask it instead. A rejected assumption becomes one question
at a time, naming what it changes. Present the ledger once. No script reads it. This ledger and the
argument log are adapted from chaseai-yt/claudex-loop (MIT).

## Rules every review round follows

These are what make a register row worth recording.

- **Scope is the slice's own diff.** Every review charter names the diff (`git diff
  origin/main...HEAD`) and requires each finding to anchor to a line it added or changed. Code the
  slice merely calls is out of scope unless the slice made it reachable or worse; a widened
  pre-existing defect is in scope only up to the widening, and the remedy restores the pre-slice blast
  radius, no more. An out-of-scope defect goes in a separate "observed, out of scope" section with no
  disposition and never enters the register.
- **4a and 4b run in parallel in separate worktrees.** 4b mutates production code; sharing a worktree
  produces false SURVIVED results, which read as coverage gaps and send the next round after a hole
  that does not exist.
- **4b uses a named mutation list and an unmutated control.** Attempt at least: revert the fix itself;
  weaken each guard's precision rather than deleting it; delete a message or status while leaving
  behavior intact; replace a helper with the naive version a future editor would write; break each
  exemption and confirm the clean fixtures fail. Report a table of mutation, outcome and the assertion
  that killed it. A kill with no named assertion is not a kill. The control run proves the harness can
  tell mutants apart at all.
- **Code quality is reported separately and ranked below correctness** in every charter, so a
  structure nit never outranks a missed defect. It is adjudicated the same way: fixed, or accepted
  with a rationale.
- **Every fixer answers in writing:** does anything I added admit the state I was fixing, or its
  mirror, or assert something I did not measure? When a fix replaces a check rather than adding one,
  list what the old check caught that the new one does not.

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

## Merging

`pipeline-merge.sh` runs both verifiers, refuses on either, and on success posts their output as a
comment on the PR and prints the merge command. It never merges for you. The comment is the artifact:
a PR merged around the gate is visible afterwards by carrying none.
