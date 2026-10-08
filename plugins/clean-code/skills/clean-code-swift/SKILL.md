---
name: clean-code-swift
description: >-
  The Swift spelling of the clean-code method: where a module boundary is enforceable and the one
  build flag that checks it, the three-target layout, struct/protocol/enum choices, access levels,
  contract suites as protocols, makeSUT and leak tracking, the swift gates, and the file-size table.
  Use whenever a Swift package, framework or Xcode project is built or restructured, a target
  boundary is drawn, a protocol versus enum versus struct is chosen, access levels are picked, test
  doubles or contract suites are written, or Swift work is reviewed, even if the request only says
  "refactor" or "clean up". Read it with the language-neutral clean-code skill; this file owns every
  number.
---

# Clean code: Swift

Read `../clean-code/SKILL.md` first; it carries the method. This file says how each rule is spelled
and enforced in Swift, and it is the only place the numbers live. The worked example behind the test
patterns is `essentialdevelopercom/essential-feed-case-study`; measurements below come from it and
from probes on Swift 6.3.

## File sizes

Count lines per file, split by target:

    git ls-files '*.swift' | tr '\n' '\0' | xargs -0 wc -l | grep -v ' total' | sort -rn

The `tr`/`-0` matters: Xcode folders routinely contain spaces, and a plain pipe to `xargs` drops those
files silently.

| file | hard limit |
| --- | --- |
| production | 200 lines |
| test | 700 lines |

These are Swift's own numbers, not Rust's. A production file near 200 is a responsibility problem
before it is a length problem: across the case study's 59 production files the median is 24 lines and
the largest is 164. A 590-line test file is compliant on size; split it only if it covers several
behaviors. One split attempt per oversized file per pull request (method, Termination).

## Where a boundary is enforceable

**A module (a SwiftPM target or an Xcode framework target) is the only unit of enforcement, and a
plain `swift build` does not enforce it.** Measured: with targets `A` and `C` declared independent and
a file in `A` doing `import C`, a fresh parallel build refuses it, but `swift build -j 1` accepts it,
and a second build of the same tree accepts it once `C`'s module is in the scratch path. The default
build answers by scheduling order, so a retry of a red build goes green with the boundary still
broken. The gate has to be asked for:

    swift build --explicit-target-dependency-import-check error

It refuses an undeclared import regardless of build order or scratch state
(`error: Target A imports another target (C) in the package without declaring it a dependency.`).
This is the line for CI and for the exit checklist. A declared cycle is refused before compilation.

**Neither gate reaches past the declared chain.** With `A` depending on `D` and `D` on `C`, a file in
`A` importing `C` compiles under every form of the check. Cargo refuses the same shape; Swift does
not. A transitive import is caught by reading the import lines, or not at all.

**A folder enforces nothing.** `internal` scopes a symbol to its module, and two folders in one target
are one module, so a `Feature/` file importing CoreData and calling an `Infrastructure/` type
compiles. Folders record intent for a reader; a reviewer holds them by reading import lines and call
sites per pull request.

So the layout is three hard boundaries, with the roles as folders inside the first:

| module | imports | holds |
| --- | --- | --- |
| `<Tool>` | Foundation, a persistence framework | domain (`Feature/`), use cases, ports, adapters (`API/`, `Cache/`), presenters |
| `<Tool>UI` | UIKit or SwiftUI, `<Tool>` | views and view controllers |
| `<Tool>App` | both | the composition root and nothing else |

The split catches UI leaking inward (separate targets) and catches nothing of infrastructure leaking
into the domain (same target). If that direction must be enforced rather than reviewed, the adapters
get their own target. Say which choice was made.

The domain folder excludes filesystem and networking APIs, database frameworks, `ProcessInfo`
environment reads, `Process` spawning, AppKit, UIKit, SwiftUI, vendor SDKs and printing. Standard
library first; Foundation only for a genuine primitive such as `UUID`, `Date` or `URL`.

## The composition root

One module whose only job is to build the object graph, the only place that knows every other
module. It alone constructs adapters and wires them to ports; decorators and proxies live here (a
remote-with-local-fallback strategy is composed here, not inside either loader); it carries an
injection seam for tests (a `convenience init(httpClient:store:)` on the scene delegate, used only by
acceptance tests); and it holds no policy.

## Abstraction choices

- a **struct** for one implementation with no substitution need; a reference type needs a reason
- a **closure** for one injected operation: `currentDate: @escaping () -> Date = Date.init`
- a **protocol** for a stable external capability, one method wide unless several operations form one
  transactional contract (`func save(_ feed: [FeedImage]) throws`)
- **protocol composition** (`FeedStore & FeedImageDataStore & Sendable`) to require several narrow
  capabilities of one collaborator without inventing a wide protocol
- an **enum with associated values** for a closed set of alternatives, switched exhaustively without
  a default case; this is "make invalid states unrepresentable"
- a **wrapper struct** with a failable or throwing initializer for validated identifiers and secrets,
  with `description` and `debugDescription` that never print the value
- a **`final class` with `private init()`** for a stateless policy namespace, rarely
- an **existential, written `any Protocol`**, only in the composition root's heterogeneous collections

Not: a protocol per type, one-method wrappers for injection, `any` through domain code, a class where
a struct works, inheritance where a protocol extension's default does. Mark classes `final` unless
subclassing is the design.

## Access levels

`private`, `fileprivate`, `internal` (the default; write nothing), `package`, `public`, `open`.
`public` only where a symbol crosses a module boundary: the domain models, the ports, the presenters
the UI consumes. `package` for cross-target collaboration that must not escape the package. `open`
almost never; nothing here is designed for external subclassing.

## Errors, outcomes, concurrency

`async throws` is the idiomatic port shape. `Result` where an outcome is stored, compared or replayed
rather than propagated. A bare `Optional` collapses "absent", "unreadable" and "unknown" into one
value, which is the failure-direction bug the method warns about. Never force-unwrap or `try!` on
anything depending on operator input or runtime conditions; `fatalError` only for a compiled-in
invariant. Adopt strict concurrency (`swiftLanguageModes: [.v6]`); `@unchecked Sendable` is an
unexplained suppression. Every spawned task has an owner, a deadline and a cancellation path.

## Tests

The method's obligations are unchanged: test-first for new behavior, proof of no change for a move,
one mutation-table row per changed behavior (`../clean-code/TESTING.md`), a deadline on anything that
can hang. These five patterns are how the case study spells them; copy them.

**A contract suite is a protocol whose method names are the test names:**

    protocol FeedStoreSpecs {
        func test_retrieve_deliversEmptyOnEmptyCache() async throws
        func test_insert_overridesPreviouslyInsertedCacheValues() async throws
    }
    protocol FailableInsertFeedStoreSpecs: FeedStoreSpecs {
        func test_insert_deliversErrorOnInsertionError() async throws
    }

`class CoreDataFeedStoreTests: XCTestCase, FeedStoreSpecs` fails to compile if a case is missing. The
capability protocols compose with `&`, so an implementation that cannot fail on insert is not forced
to fake that test. Shared bodies are free functions taking `on sut:`; each conforming class holds only
the wiring. Run the same suite against the durable and the in-memory implementation.

**`makeSUT` is the only way a test builds its subject**, returning a labeled tuple, defaulting the
clock to `Date.init`, and leak-checking every instance:

    private func makeSUT(currentDate: @escaping () -> Date = Date.init,
                         file: StaticString = #filePath, line: UInt = #line)
        -> (sut: LocalFeedLoader, store: FeedStoreSpy) {
        let store = FeedStoreSpy()
        let sut = LocalFeedLoader(store: store, currentDate: currentDate)
        trackForMemoryLeaks(store, file: file, line: line)
        trackForMemoryLeaks(sut, file: file, line: line)
        return (sut, store)
    }

**Every instance is checked for leaks**, because a retain cycle is exactly what a decorator-heavy
composition root introduces:

    extension XCTestCase {
        func trackForMemoryLeaks(_ instance: AnyObject, file: StaticString = #filePath, line: UInt = #line) {
            addTeardownBlock { [weak instance] in
                XCTAssertNil(instance, "Instance should have been deallocated.", file: file, line: line)
            }
        }
    }

**Thread `file:` and `line:` through every shared helper**, so a failure reports at the calling test,
not inside the helper.

**A spy records messages, it does not count calls:** `enum ReceivedMessage: Equatable` plus
`private(set) var receivedMessages`, asserted as one array, pins which messages arrived, with what
arguments, in what order.

Layers, each its own target: unit tests per module; a cache integration suite against the real
store; an end-to-end suite against the real endpoint; an acceptance suite driving the whole app
through the composition root's seam with stubbed infrastructure; snapshot tests for the UI. The
network stays out of everything but the end-to-end suite. Tests live in a separate target, so
test-only code in a production file behind `#if DEBUG` is a finding.

Tooling: no mutation tool for Swift is assumed; produce the rows by hand. Thread and address
sanitizers are available; run `-enableThreadSanitizer YES` for anything with concurrency.

## Gates

    swift build --explicit-target-dependency-import-check error
    swift test
    swiftformat --lint .
    swiftlint

For an Xcode project: `xcodebuild clean build test -project <p> -scheme <s>`, through `xcbeautify`.
The committed lockfile is `Package.resolved`; `--disable-automatic-resolution` on `swift build` and
`swift test` is the analogue of cargo's `--locked`. Confirm that flag on the first package before
treating it as a gate. A `swiftlint:disable` names the rule, covers the narrowest region, and says why
the rule is wrong there.

## Open for Swift

The case study drives no executables and spawns no processes, so the egress protocol, process
ownership and process-group rules carry over from the method unadapted. It uses CoreData, not SQLite
with concurrent writers, so a Swift tool with several writing processes works out its busy-database
policy before the first store lands.
