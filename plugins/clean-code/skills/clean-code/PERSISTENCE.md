# Persistence, delivery safety, and configuration

Where durable state lives and how it survives a crash. Reference for [`SKILL.md`](SKILL.md).

## Classify the state before choosing a store

Derive the state inventory from the source: grep for every path the code writes, then classify each
as a public or external contract, an internal persistence detail, a temporary process-coordination
mechanism, or a compatibility artifact. An inventory you were handed is not evidence; check every
name against the code. The classification usually surfaces deletion targets (names a sweep removes on
every tick and never reads) and orphans (names nothing writes, or nothing reads outside tests).
Migrate durable user state that should survive; never discard existing state silently.

## SQLite or the filesystem

Internal durable multi-record state goes into a transactional SQLite adapter unless the filesystem
path, name, metadata or existence is itself an external contract. SQLite fits a same-host, low-volume,
multiprocess workload: WAL mode, versioned migrations, explicit transactions, bounded busy timeouts
handled by every caller, restrictive file permissions, typed codecs, crash-recovery and contention
tests. A synchronous driver unless a runtime requirement proves otherwise.

Semantic repositories, not one generic state store: one per family of records, named for what it
holds. One SQLite type may implement several application-owned repository interfaces. Provide an
in-memory implementation for fast tests and run the same contract suite against both.

Two filesystem facts bind any protocol that stays on disk. **Concurrent `unlink` does not arbitrate**:
it reports success to every racer, so ownership is taken by rename or by `O_EXCL` creation, never by
removal. **Writers are many processes**: short-lived hooks, a daemon, a shell notifier, another
tool's alert path. Name the writers of each state family before choosing its store.

A side channel never fails the work it reports on, so on the delivery path a busy, locked, missing or
corrupt database is fail-open: deliver, and record the miss where recording is possible. State
mutation is fail-closed. Write this down as a decision before the first database code lands.

The filesystem stays where it is the interface: configuration files, executable discovery,
operating-system and terminal metadata, markers a third party observes, configuration publication and
backups, compatibility state external tools consume. Where it stays, name the semantic operation
(atomic publish, append, claim, lease, marker) and test its race behavior; never collapse them into a
vague `FileStore`.

## Delivery safety

Five rules, one mechanism:

1. **One idempotency key per event, minted at creation**, carried in the body and in an
   `Idempotency-Key` header. A replay carries the original key, never a fresh one, because a replay
   path that re-sends journaled misses will re-send one that got through. The key identifies the
   caller's logical submission, `(caller identity, caller request id)`, never the content; two
   legitimate events can carry identical bodies. A unique delivery is `(event id, destination)`.
2. **Say at-least-once, honestly.** Only a destination that persists and enforces the key can
   deduplicate. A boolean-returning destination cannot; a spawned process proves only that a process
   ran; an ignored exit status proves nothing.
3. **Do not retry inline.** A synchronous send is synchronous so that failure is visible, and a
   notification must never stall the work it reports on. Hand a failed send to the component that
   already runs leased jobs, so the retry is a job, not a stall.
4. **Write the journal entry before attempting delivery; clear it on confirmed success.** A timeout is
   an unknown outcome; write-ahead turns "might lose an event" into "might deliver twice", and the key
   makes the second harmless.
5. **The outbox row is the queue.** A failed leg stays pending and the daemon leases that row; no
   second job record. Acknowledged rows are kept as audit history. "Acknowledged" means the gateway
   accepted the request, not that the operator saw it.

A recording decorator wraps each destination at the composition root, so recording cannot be
forgotten. It is fail-quiet (it never changes the delivery outcome) but not invisible: record what the
destination acknowledged and whether that was recorded, and surface recorder failures through the log
and the diagnostic command. Order is best-effort: a deferred failure reordering behind a later
success is inherent, so record a monotonic sequence and promise nothing stronger.

**"Where did this event go" has exactly one answer, derived from outcomes.** The plan is not that
answer: an unavailable backend, a contradictory override or a failing destination all deliver nothing
while a plan-based journal records success. Any code path that decides delivery from partial inputs
before the plan exists is a second authority that will disagree with the first.

Audit every write against every send for crash windows: delivery before both the decision record and
the journal loses both; a replay that deletes its claim before delivering loses the event; a drain
that skips claimed rows while the worker deletes its claim before spawning loses the job on either
side of a restart. A test asserting "the claim never survives the run" pins a loss window as intended
behavior.

## Configuration

Separate raw deserialization types, validated application settings, adapter settings, schema and key
metadata, template rendering, filesystem loading, setup answers, publication, migrations and operator
diagnostics. Domain and application code never depend on a dynamic configuration value type or a
free-form table.

Strict decoding, with tested rejection of unknown keys, unknown component names, invalid bounds,
malformed values and unsafe paths. One authoritative definition per key: name, default, bound, secret
classification, component identity; the renderer, the setup wizard, the decoder and the documentation
are all checked against it, with golden and anti-drift tests. No custom schema language unless it
removes more complexity than it adds.

Secrets get a type that cannot reveal its value through the language's ordinary debug and display
conversions, and stay out of diagnostics, traces, protocol responses and test failure text. Where a
template pulls secrets from a password manager, the exact action is a contract pinned by tests whose
stub refuses any other action.

An explicit configuration version with migrations. A package keeps its renderer tests against
fixtures it owns and pins `template == render(values)` from the outer repository; a package that
reaches outside its own folder, by a compile-time include or a runtime path join, stops building the
day it moves.
