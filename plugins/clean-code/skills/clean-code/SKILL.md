---
name: clean-code
description: >-
  The language-neutral method for building or restructuring a tool into layered modules, with a
  written target, a finite procedure, a pull-request ladder and an exit checklist of conditions a
  command can verify. Use whenever code is being restructured into modules, a boundary or seam has
  to be placed, a versioned protocol between a tool and its callers is designed, a store for
  durable state is chosen, a large refactor is planned as a series of pull requests, or work is
  reviewed against SOLID, file-size and test-quality rules, even when the request only says "clean
  this up" or "refactor". Always pair it with clean-code-rust or clean-code-swift for the language
  at hand; the numbers live there.
---

# Clean code

The method for taking a tool from where it is to a layered architecture without losing behavior on
the way. It is language-neutral: the roles, the procedure, the test obligations and the delivery
rules are the same whatever the tool is written in.

**Read the language skill alongside this one, always**: `../clean-code-rust/SKILL.md` or
`../clean-code-swift/SKILL.md`. This skill says what must be true; the language skill says how that
is spelled and enforced in its toolchain, and it alone carries numbers (file sizes, gate commands,
counting commands). Nothing here repeats them, so the two cannot disagree.

Three references, consulted rather than read front to back:

- [`ARCHITECTURE.md`](ARCHITECTURE.md): the five module roles, the extension model, SOLID, choosing
  an abstraction, outcomes, concurrency, public API discipline, file-size rules.
- [`TESTING.md`](TESTING.md): new behavior versus a pure move, the mutation table, the speed gate,
  the sandbox rule, the test levels.
- [`PERSISTENCE.md`](PERSISTENCE.md): classifying durable state, a database versus the filesystem,
  delivery safety, configuration and secrets.

## Priorities, in order

1. Correct observable behavior and safety invariants.
2. Stable compatibility and protocol contracts.
3. Deterministic, meaningful tests.
4. Dependency direction and architectural boundaries.
5. Cohesion and clear ownership.
6. Small source files.
7. Reuse through demonstrated abstractions.
8. Performance improvements supported by evidence.

Never damage a higher item to satisfy a lower one. A line count, an interface count or a coverage
percentage is never a reason to weaken behavior, a contract or a test.

## Write the target down before touching code

The work is finished when the tree matches three documents, so write them first. They are the
measuring sticks for the exit checklist; without them "done" is an opinion.

1. **The module map**: the units the tool will have, the allowed dependency edges between them, and
   one sentence per unit saying what it is responsible for. A unit whose sentence needs "and" is two
   units. A tool too small for five roles takes fewer; say which role was folded into which and why.
2. **The behavior baseline**: the set of leaf test names with their results, taken before any move,
   never a count. A count passes when one test is dropped and another added. Every permanent-contract
   test maps to its successor by name; a removed test appears in the mapping with its reason. Save the
   specifications as `Given` / `When` / `Then` scenarios under `docs/specs/` and the reasoning behind
   each non-obvious choice under `docs/decisions/`, both inside the package so they move with it.
3. **The consumer list**: every caller outside the tool's folder (build scripts, task runners, sibling
   packages, generated files, the command-line surface), each with what may change, what stays
   fixed, and the command that proves it. Prove by running the command, never by reading. The frozen
   surface is what this list proves; an accidental behavior no consumer parses (a panic's banner, an
   unformatted message) may change, with a decision record saying so.

Name modules and types from the source's own vocabulary. Where a circulated glossary and the code
disagree, the code wins. `manager`, `handler`, `service`, `utils`, `common` and `misc` are allowed
only when nothing more precise exists.

The existing tests carry the product, compatibility, privacy, concurrency, process-lifecycle and
failure-direction specifications: preserve those. Do not preserve accidental internal structure
because a mechanism-specific test happens to assert it. Do not invent product behavior without
recording it as a decision.

## The procedure

Each step ends in a named artifact. A step without its artifact did not happen. A step with nothing to
do for this tool (no protocol, no plugins) is recorded as such in a decision record, which is then its
artifact.

| step | work | artifact |
| --- | --- | --- |
| 1 | Record the baseline suite and the consumer list | the two documents above |
| 2 | Classify every test: permanent contract, adapter contract, obsolete mechanism test, migration test | the test mapping |
| 3 | Create each unit in the PR that gives it code, with its declared edges; update every consumer in the same PR | the build passes with the map's edges and no others |
| 4 | Move pure policy into the domain unit | domain builds with no infrastructure dependency |
| 5 | Define use cases and the ports they own; define the versioned protocols test-first | protocol fixtures per version |
| 6 | Reimplement the legacy entry points as adapters over the use cases | the legacy tests pass through the adapters |
| 7 | Replace central name-based dispatch with registries holding real implementations | no switch on a destination or plugin name remains |
| 8 | Move durable state into semantic repositories; migrate or deliberately preserve existing state | contract suite green on each implementation |
| 9 | Move system, network, filesystem and process behavior into adapters; reduce the executable to decoding and composition | entry point under the language skill's limit |
| 10 | Split tests by behavior; delete obsolete compatibility code and mechanism tests | mapping complete, no `part1` files |
| 11 | Run the exit checklist | the completion report |

Do not stop after creating interfaces while the old modules still own the behavior. Do not leave two
architectures in the tree past the pull request that introduces the second. No placeholder adapters,
TODO-only use cases or unused protocols.

## The pull-request ladder

The end state is fixed; it lands as an ordered series of pull requests to `main`, one or more per
step. Decide the ladder (how many PRs, which step each covers) before opening the first, and write it
in the first PR's description. Every PR:

- builds from the committed lockfile and passes the project's gates (the language skill names them),
  plus every dependent consumer's own test command;
- leaves `main` deployable;
- states which kind of work it is, **new behavior** or **pure move**, with the evidence
  [`TESTING.md`](TESTING.md) demands for that kind;
- for a tool with a command-line surface, passes a differential over the frozen surface against the
  binary built from the previous `main`, **with a control mutant the differential is shown to catch**.
  A differential without a failing control proves nothing: one harness compared a file with itself and
  reported zero mismatches against a broken binary;
- is small enough to review in one sitting. Decompose by behavior before starting.

## Termination

These rules exist because "make it clean" has no natural end, and an agent that keeps improving
never ships.

- **The exit checklist decides.** When every row passes, the work is done, even if more could be
  improved. What remains is filed as a task with a reason, never silently dropped and never chased in
  the same PR.
- **One action per finding per PR.** A review finding against this standard is fixed once, or recorded
  with its reason. The same finding does not get a second round in the same PR.
- **One split per oversized file per PR.** Split by responsibility. If one of the resulting pieces
  cannot be described in one sentence, keep the file whole and record it in the exceptions table with
  the sentence that failed. Never split by `part_1`, never move code into `utils` to shrink a number.
- **One mutant per changed behavior.** The mutation table ([`TESTING.md`](TESTING.md)) has one row
  per behavior the PR adds or changes, plus the control row. When every row names its killing
  assertion or carries an intermediate-state argument, mutation work is finished.
- **The ladder has a length.** If the PR count passes twice the number written in the first PR, stop
  and re-plan with the owner instead of continuing.
- **Gates are run, not reasoned about.** Report a command as passed only when it ran and exited 0.

## Exit checklist

Every row has a check that does not depend on judgment.

| condition | check |
| --- | --- |
| Dependency edges equal the module map | the language skill's boundary command passes; an undeclared edge fails the build |
| Domain unit has no infrastructure dependency | its manifest names none; the language skill's manifest test |
| Baseline tests all accounted for | every baseline name passes or appears in the mapping with a reason |
| New behavior landed test-first | each PR cites the commit where the test failed before the implementation |
| Mutation table complete | every row has a killing assertion or an argument; the control row is green |
| Differential passed with a failing control | its output in the PR, control mutant included |
| Every test under the speed gate | the suite's own timing guard reports no violation |
| No test reaches a real destination | the harness uses a sandbox `HOME` and scripted transports |
| File sizes within the language skill's table | the counting command's full output in the report; exceptions listed with reasons |
| Entry point under the language skill's limit | the counting command |
| No central name switch | search for the old dispatch sites returns nothing |
| Consumers proved | each consumer's command ran and passed |
| Specs and decisions inside the package | `docs/specs/`, `docs/decisions/` exist and the package has no path reaching outside its folder |

## Completion report

Short and complete; it is read by whoever maintains the tool next.

1. The module map as built, with the dependency graph.
2. The behavior specifications and decision records created.
3. Each protocol with its versioning and compatibility policy.
4. How each legacy entry point maps into the new use cases.
5. The registries introduced and the central dispatch removed.
6. Which durable state moved stores, which filesystem protocols stayed and why the filesystem is
   part of their contract, and how existing state was migrated.
7. The test mapping, per PR: kind of work and its evidence; the mutation tables.
8. The counting command's output for every handwritten file; the exceptions table.
9. The exact commands run and their results, including the differential and its control.
10. Every change made outside the tool's folder, with the need that drove it.
11. What the operator must verify live after they deploy; agents never deploy or drill live systems.
12. Unresolved risks and the tasks filed.

## Standing rules

- Never describe the work as complete while a known oversized module, a duplicate architecture, a
  failing test, a protocol ambiguity or an unowned process remains. Say so and file it.
- No broad lint suppressions: a suppression is narrow and explains why the lint is wrong there.
- Conventional Commits, one logical change per commit.
- The operator runs deployments and live drills. No test, differential or verification step touches
  a real destination.
