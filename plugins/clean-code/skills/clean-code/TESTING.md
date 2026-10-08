# Testing

What counts as proof, and what only looks like it. Reference for [`SKILL.md`](SKILL.md). Use the
narrowest reliable test level.

## Two kinds of work, two obligations

**New behavior is written test-first, without exception.** Write the failing test, run it, see it
fail for the reason you intended, then make it pass. The commit where the test fails is the evidence;
cite it in the pull request. This covers every new protocol and decoder, every repository and
migration, the configuration version and its migrations, the snapshot's coherence and memoization
guarantees, every new typed outcome, and any behavior a specification states but no test pins.

**A pure move owes proof it changed nothing.** A "failing test" for a move is theatre: it passes
before and after. Before moving code, confirm its behavior is pinned by a test that can fail; if not,
write that test against the code where it is now and land it before the move. The move is then
verified by the test-name set diff and, for a tool with a command surface, the differential against
the previous `main`.

State in each pull request which kind it is, and give the matching evidence.

## The mutation table

Every behavior a pull request adds or changes gets one row. The row is finished when it names the
assertion that killed the mutant, or carries an argument why no observable can tell the two versions
apart. The table is finished when every row is, plus the control. There is no second pass.

| behavior | mutation | result | killed by |
| --- | --- | --- | --- |
| control (unmutated) | none | green | n/a |
| `<behavior>` | `<what was changed in the source>` | red / SURVIVED / equivalent | `<test name>` or the argument |

A SURVIVED row is a defect in the tests, fixed in the same pull request. Where a mutation tool is
installed the language skill says how to run it; otherwise the rows are produced by hand, and the hand
version has five failure modes to check by name:

- **A probe that never proves its edit landed.** Assert the mutated bytes are on disk before trusting
  the result; otherwise the control has been run twice.
- **A mutant that hangs instead of failing.** A test that blocks on a thread, socket, pipe or child
  has a failure mode that is not red but never finishing. Give every such test a deadline, and
  mutation-verify by making the subject hang, not only by making it answer wrongly.
- **Nothing exercises the composition root.** A slice whose tests all hit pure functions passes with
  the wiring function replaced by a constant. Make that mutation explicitly.
- **An unbacked "equivalent" claim.** A genuinely equivalent mutant is green by definition and so is
  an uncovered one, so the claim needs an argument about intermediate states, not the final output.
- **A control that only proves the feature ran.** A negative test's control shows the specific guard
  fired, not merely that the code path executed.

## Speed is a gate

Every test passes within one second, measured, or it is fixed or removed. Enforce it in the suite's
own support module: a case over the budget warns; one over the ceiling fails unless an explicit escape
names a structural cause. A CI runner can be several times slower than a development machine, so a
test near the budget locally fails there. Bound property tests by case count; contention and
crash-recovery tests use small fixtures and poll for evidence; measure with the runner's real
parallelism, since units compete for the same CPU. No arbitrary sleeps for synchronization: poll,
use channels or barriers, or inject a controlled clock.

## Nothing reaches a real destination

No test, differential or verification step reads the operator's real configuration, touches the real
state directory, or contacts a real service, gateway, device or notification system. Every run uses
a sandbox `HOME` and scripted transports. Know which of the tool's own commands have live effects (a
diagnostic command, a manual trigger) and exclude them from every harness; extend the existing
differential rather than writing a second one.

## Test levels

- **Unit tests** sit beside their implementation, excluded from production builds by the language's
  own mechanism. A large unit module may live in a private child file; that is still a unit test and
  still does not ship.
- **Contract tests** are reusable behavioral suites for ports with several implementations: success,
  each failure class, idempotency, replacement, ordering, absence of unintended side effects,
  atomicity, concurrency semantics, persistence across instances where promised.
- **Adapter integration tests** run real adapters against controlled infrastructure: temporary
  databases, scripted transports, temporary files, exact argv runners, isolated process trees.
- **Acceptance tests** keep black-box coverage of assembled workflows and process-boundary contracts,
  split by behavior (one file per protocol, legacy entry point, policy area, persistence,
  diagnostics, setup, privacy, process lifecycle), never into `part1` and `part2`.
- **Protocol and golden tests** carry a fixture per protocol version and test exact tagged shapes,
  unknown versions, missing and malformed fields, size limits, hostile text, additive fields,
  duplicate request ids, request-result correlation and legacy translations.
- **Property and fuzz tests** only where they cover an input space better than examples do: decoders,
  state codecs, path and identifier validation, duration parsing, Unicode sanitization, budgeting
  and scheduling invariants.

## What to keep testing explicitly

Fail-open versus fail-closed direction; exact threshold values and one step either side; future and
backward clocks; malformed and hostile external data; path traversal; control and Unicode format
characters; no leakage of private content; no use of the real state directory; process cleanup and
bounded child execution; no fixed sleeps; a complete diagnostic census despite individual failures;
no side effects from observation events; truthful operator wording.

Exact output assertions only where wording, stdout, stderr or exit status is an external
compatibility or operator-safety contract. Otherwise assert on typed outcomes.
