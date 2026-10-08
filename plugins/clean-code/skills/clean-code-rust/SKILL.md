---
name: clean-code-rust
description: >-
  The Rust spelling of the clean-code method: a Cargo workspace per tool with one crate per role,
  Cargo manifests as the boundary enforcer, trait/enum/newtype choices, typed errors, fenced unsafe,
  rusqlite persistence, cfg(test) layout, the cargo gates, and the file-size table with its counting
  command. Use whenever a Rust crate or workspace is built or restructured, a crate boundary is
  drawn, a trait versus enum versus concrete type is chosen, a persistence crate is picked, or Rust
  work is reviewed, even if the request only says "refactor" or "clean up this crate". Read it with
  the language-neutral clean-code skill; this file owns every number.
---

# Clean code: Rust

Read `../clean-code/SKILL.md` first; it carries the method (priorities, the written target, the
procedure, the ladder, termination, the exit checklist). This file says how each rule is spelled and
enforced in Rust, and it is the only place the numbers live.

## Standards

- TDD: failing behavioral test, minimal implementation, refactor.
- SOLID and DRY, without speculative abstractions.
- Self-documenting code; comments only for non-obvious intent or safety.
- Idiomatic safe Rust: explicit ownership, typed errors, deterministic cleanup, bounded resources.
- `unsafe` is rare and fenced: each block as small as possible, in its own small module, with a one-
  or two-line `// SAFETY:` comment proving why undefined behavior is impossible, plus focused tests.
  Enable `clippy::undocumented_unsafe_blocks` and `clippy::unnecessary_safety_comment` so a missing
  or stray comment fails the gate instead of a review.

## File sizes

Count after `rustfmt`, with this command and no other (`tokei` mis-parses `cfg(test)` trees):

    git ls-files '<crate-path>/*.rs' | while IFS= read -r f; do
      awk -v F="$f" '
        /^[[:space:]]*#\[cfg\(test\)\]/ && !seen { seen = 1 }
        !seen { impl++ }
        { total++ }
        END {
          if (F ~ /(^|\/)tests(\.rs|\/)/) impl = 0
          printf "%5d impl %5d total  %s\n", impl, total, F
        }' "$f"
    done | sort -k1,1rn

Implementation lines are those before the first `#[cfg(test)]`; a file named `tests.rs` or under
`tests/` has zero. A `#[cfg(test)]` item above production code is a finding, not a way to shrink the
number.

| file | target | hard limit |
| --- | --- | --- |
| production (`impl` lines) | 150 | 250 |
| test file (total lines, separate from production code) | 300 | 400 |
| any handwritten `.rs` (total lines) | | 500, no waiver |
| `main.rs` | under 100 | 150 at completion |

Over the target is a responsibility review; over the hard limit is one split attempt per pull request
(method, Termination), with the exception recorded if the split cannot name one responsibility per
piece. The completion report carries the command's full output.

## The workspace

Five roles, five crates, one Cargo workspace:

    crates/<tool>-domain
    crates/<tool>-application
    crates/<tool>-protocol
    crates/<tool>-adapters
    crates/<tool>-cli          # [[bin]] name = "<tool>", because callers invoke it by that name

**`Cargo.toml` is the enforcer.** A crate can only `use` what its own `[dependencies]` names, so an
inward dependency from domain or application code to an adapter fails to compile. A declared cycle is
refused outright. Pin the direction with one test in the domain crate that reads its own `Cargo.toml`
and fails if any non-dev dependency appears; that is the exit checklist's "manifest test". Commit
`Cargo.lock` and build `--locked`. Pin `channel = "stable"` in `rust-toolchain.toml` so a plain `cargo`
runs the same toolchain everywhere.

The domain crate excludes filesystem access, SQLite, TOML, JSON, HTTP, environment variables,
process spawning, platform APIs, vendor APIs, executable discovery and CLI output. `std` only, unless
a small dependency is a genuine domain primitive.

A crate that reaches outside its own folder with `include_str!` or an `env!("CARGO_MANIFEST_DIR")`
join stops compiling the day it moves repositories; keep its tests against fixtures it owns.

## Abstraction choices

- a **concrete type** for one implementation with no substitution need
- a **closure** for one injected operation such as a clock or a mapper
- a **trait** for a stable external capability or a meaningful contract
- an **enum** for a closed set of alternatives; this is how "make invalid states unrepresentable" is
  spelled, replacing conflicting boolean pairs
- a **newtype** for validated identifiers and sensitive values; implement `Debug` and `Display` by
  hand so a secret cannot print itself
- **generics** when compile-time composition improves clarity
- **`dyn Trait`** only in the composition root's heterogeneous collections

Not: a trait per struct, one-method wrapper types for injection, `Box<dyn Trait>` through domain
code, generic parameters that obscure the use case, a service locator, or macros that hide branching.

The destination interface, as an example of a port:

    trait NotificationDestination: Send + Sync {
        fn id(&self) -> &DestinationId;
        fn capabilities(&self) -> DestinationCapabilities;
        fn deliver(&self, request: &DeliveryRequest) -> DeliveryOutcome;
    }

## Errors, outcomes, concurrency

`Option` cannot distinguish several failure or unknown states; use a typed `Result` or a purpose-built
enum. No panic on ordinary external failure: a panic is for a compiled-in invariant that cannot depend
on operator input or runtime conditions, so no `unwrap` or `expect` on untrusted input. `Arc<Mutex<_>>`
is the last resort after ownership, immutable sharing, channels, task confinement and transactions.
No Tokio or other async runtime unless a measured requirement demands one; a synchronous,
deadline-bounded model is acceptable.

## Visibility

Private by default. `pub(super)` for narrow parent collaboration, `pub(crate)` for internal
cross-module use, `pub` only for intentional crate APIs. Curate exports in `lib.rs`; never make the
module tree public so integration tests can reach it.

## Persistence

Synchronous `rusqlite` over an async database layer unless a runtime requirement proves otherwise.
WAL mode, versioned migrations, explicit transactions, bounded busy timeouts (every caller handles
`SQLITE_BUSY`), restrictive file permissions, typed codecs. Domain and application code never depend
on `toml::Value` or free-form tables.

## Tests

New behavior is written test-first under `cargo test`; a pure move owes a test that already pins the
behavior, written before the move if none exists; every changed behavior gets a mutation-table row
(`../clean-code/TESTING.md`).

Unit tests live beside their implementation under `#[cfg(test)] mod tests;`; a large module may live
in a private child file (`src/x.rs` beside `src/x/tests.rs`), still `cfg(test)`, still not shipped.

Tooling: if `cargo mutants` is installed, run it on the changed crates and paste the summary as the
mutation table's evidence, with the control being its baseline run; otherwise produce the rows by
hand. Add `proptest` only after naming the input space it covers better than examples do. Miri, when
available, is local evidence, not a gate. `cargo test --workspace` runs crates in parallel on one CPU,
so measure the speed gate under that configuration.

## Gates

A project with a `just gates` recipe runs that; otherwise these lines, which are what such a recipe
contains:

    cargo fmt --all -- --check
    cargo check --workspace --all-targets --locked
    cargo clippy --workspace --all-targets --locked -- -D warnings \
      -W clippy::undocumented_unsafe_blocks -W clippy::unnecessary_safety_comment
    cargo test --workspace --no-fail-fast --locked
    RUSTDOCFLAGS="-D warnings" cargo doc --workspace --no-deps

Plus the project's own build line and every dependent consumer's test command. A `#[allow]` is
narrow and explains why the lint is wrong at that location.
