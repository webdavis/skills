# Architecture

The module roles, the extension model, SOLID, and how to choose an abstraction. Reference for
[`SKILL.md`](SKILL.md). The language skill names the concrete construct behind every "unit" here (a
crate, a target, a package) and the command that enforces the direction.

## The five roles

    <tool>-domain
        <- <tool>-application
        <- <tool>-adapters
        <- <tool>-cli

    <tool>-protocol      an independent external-contract unit used by adapters and the CLI

Each role is a real build-system unit, so the compiler, not a convention, enforces the direction. No
dependency points inward from domain or application code to a concrete adapter; declaring the
boundary in the manifest is what turns a review opinion into a build failure. The executable keeps
the tool's name, because every caller invokes it by that name.

A tool small enough that five units would outweigh the boundary they draw takes fewer. The boundaries
are the point, not the count: a tool with no external protocol needs no protocol unit. Record which
role was folded into which.

**Domain.** Pure policy: the tool's neutral event and request types, its normalized signals, its
decision, scheduling, staleness, replay and budgeting policy, its invariants and value types. It
excludes filesystem access, databases, serialization formats, HTTP, environment variables, process
spawning, platform APIs, third-party service APIs, executable discovery and command-line output.
Standard library only, unless a small dependency is a genuine domain primitive. Make invalid states
unrepresentable where practical: two independent booleans with an illegal combination become one
typed value with one case per legal state. A legal-looking legacy combination that is illegal but
tested gains no case; the legacy adapter refuses it with the tested wording. Policy never branches
directly on a caller's arbitrary string.

**Application.** Concrete use-case types by default; no interface for a use case merely because it
exists. Interfaces only for the external capabilities a use case consumes: destinations, snapshot
acquisition, external sources, clocks, repositories. Ports are narrow but cohesive: several
operations that form one transactional contract stay in one interface.

**Protocol.** A stable, versioned, source-neutral contract for whoever talks to the tool. Between
processes it is a documented text envelope (a JSON request on standard input, say), never a binary
ABI. A request carries at minimum: a schema identifier with a major version, a caller-generated
request id, caller identity, session and turn identity when available, the caller's own event name,
the normalized value policy actually keys on, occurrence time when available, bounded detail text,
typed context, and a bounded `extensions` object. Tagged alternatives, not boolean bags. The caller's
event name stays as metadata and never drives core policy. A versioned result protocol sits beside
it: request id, accepted / degraded / rejected, a decision identifier, typed per-destination outcomes,
bounded diagnostic codes, no private detail echoed by default. Reject unknown major versions; state
the policy for unknown additive fields; enforce byte, field-count, text-length, collection-length and
nesting limits at the boundary. Request ids give documented idempotency; never promise exactly-once
where a destination cannot support it ([`PERSISTENCE.md`](PERSISTENCE.md)). A separate versioned
egress protocol drives external destinations; the ingress request type is never reused as a delivery
type.

**Adapters.** Concrete infrastructure organized by capability: source adapters, destinations, each
external service, each platform reader, filesystem integrations, persistence, configuration loading
and rendering, bounded process execution. Never one broad infrastructure module.

**CLI.** Command decoding, standard input and output adaptation, exit-code translation, dependency
construction, startup. The entry point contains no policy, codec, filesystem transaction, external
request construction, payload normalization, output composition, scheduling or delivery code. The
language skill sets its line limit.

## Legacy compatibility

The current flags and entry points stay as adapters over the new use cases, preserving their tested
behavior: lenient parsing where it is tested, missing-value warnings, flags not consumed as values,
help, typo refusal, output and exit-code contracts, and the rule that a side-channel failure never
fails the work it reports on. The new domain model does not imitate the legacy parser's invalid
states; the adapter translates them explicitly.

## The extension model

No universal `Plugin` interface with optional methods or capability booleans. Separate interfaces and
registries per role: destination, stateful indicator, sensor, diagnostic check, scheduled job. A
registry holds implementations, not names. A closed set of command words decodes into an enum in the
CLI role; a registry is for an open set, and a closed one is not a dispatch smell. A destination
carries an identity, a declared capability
set and one delivery operation returning a typed outcome.

Remove central dispatch that switches on names. Adding a built-in destination requires its adapter,
its registration at the composition root, contract tests and adapter tests, and no change to policy.
Executable destinations are one configurable adapter speaking the egress protocol on standard input.
A stateful indicator (reconciliation, leases, phases, quiet policy) is its own role, not a
destination; so is a source of environmental facts.

## Environment acquisition

Split a decision that depends on the environment into three: a pure determination of which facts are
required, one snapshot acquisition, and one pure decision over the request, the settings and the
completed snapshot. The domain decision never invokes probes.

The snapshot is typed, and each reading carries its own observation time, not one shared stamp taken
before the slow probes ran. Keep `unknown` distinct from a confident negative. Treat a reading from
the future as bad input, not fresh input: arithmetic that saturates a future timestamp to age zero
promotes garbage to the freshest evidence. The adapter may probe independent facts concurrently and
memoize each one; it guarantees a fact is observed at most once per snapshot, slow probes do not
serialize fast ones, one submission uses one coherent snapshot, and an unavailable sensor never
becomes a false fact.

Failure direction is per input, not global. "Unreadable means absent" applied everywhere yields a
fresh reading holding a stale conclusion. A tie between two equally fresh inputs is uncertainty, not
evidence for the default. Urgency belongs in the decision: "missing signals mean escalate" is right
for a deadline and wrong for a routine completion at 3am. A synchronous, deadline-bounded model is
acceptable; do not add a concurrency runtime to look modern.

## SOLID

- **Single responsibility**: every file, module, type and function is describable in one sentence,
  "responsible for ______". A sentence that crosses policy, serialization, persistence, process
  execution and presentation names a split.
- **Open/closed**: extend by registering implementations at the composition root. No speculative
  extension points; an abstraction answers a real variation or a real external boundary.
- **Liskov**: a declaration proves nothing. Every interface with more than one implementation has a
  reusable behavioral contract suite run against each (in-memory versus durable repositories,
  built-in versus executable destinations, clocks and readers with a shared contract).
- **Interface segregation**: model each role separately; never one interface with optional behavior.
- **Dependency inversion**: use cases own the abstractions they consume; adapters implement them
  outward. No use case constructs an HTTP client, spawns a process, opens a file, reads an environment
  variable or decodes configuration.

## Choosing the abstraction

A concrete type for one implementation with no substitution need; a function value for one injected
operation such as a clock; an interface for a stable external capability or a meaningful contract; a
closed set of cases for a closed set of alternatives; a wrapper type for validated identifiers and
sensitive values; compile-time composition when it improves clarity; runtime polymorphism only at
heterogeneous composition boundaries. Prefer composition and explicit construction.

Do not: create an interface for every type; create one-method wrappers merely for injection; spread
runtime polymorphism through domain code; introduce type parameters that obscure the use case; build
a service locator or injection container; translate object-oriented patterns mechanically; hide
branching in macros to shorten files.

## Errors, outcomes, concurrency

A bare optional cannot distinguish several failure or unknown states, so probe results, delivery
results, configuration loading, persistence claims, protocol acceptance and diagnostic checks use
typed outcomes. Infrastructure errors stay at adapter boundaries and map into stable application
outcomes without losing what diagnosis needs. Ordinary external failures never crash the process; an
aborting assertion is for a compiled-in invariant that cannot depend on operator input or runtime
conditions. Untrusted input is never force-unwrapped.

Every spawned thread or process has an owner, a deadline, cancellation or termination behavior, error
observation, a cleanup path and shutdown behavior; process-group cleanup stays where children can
spawn descendants. A shared mutable lock is the last resort after ownership, immutable sharing,
message passing, task confinement and transactions. Unsafe platform and terminal operations live in
the smallest possible adapter modules with their invariants documented and focused tests.

## Public API discipline

Private by default, widened one step at a time: the type, the module, the package, and public only
for an intentional external API. The module tree is never exposed so integration tests can reach it;
exports are curated. The stable public boundaries are the versioned protocols, narrow request and
outcome types where needed, and any unit a sibling package depends on. Raw configuration tables,
adapter internals, state codecs and platform types are never public API.

## File size

The language skill carries the numbers and the counting command, because "where the tests begin" is
language-specific and a generic line counter mis-parses these trees. The rules that hold everywhere:

- A test-only item above production code is a finding, not a way to shrink the count.
- Generated code, bindings, fixtures and data files are exempt; large declarative data belongs in a
  data format, not in executable code.
- Small files come from responsibility boundaries. Compressing statements, deleting rationale,
  cryptic names, macros, `part_1` files and `utils` dumps all count as gaming and are reverted.
- A file-size check is not a test. Tests pin the behavior of the tool; a meta-test about code shape
  is deleted on sight. The completion report carries the counting command's full output instead.
- One split attempt per oversized file per pull request ([`SKILL.md`](SKILL.md), Termination).
