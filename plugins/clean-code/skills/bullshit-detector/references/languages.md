# Languages

A file's language comes from its first line when it has a shebang, and from its extension otherwise.
A template keeps the language of the name under the template extension: `install.sh.tmpl` is judged
as `install.sh`.

| `lang:` | First line | Extensions | Overlay |
| --- | --- | --- | --- |
| `sh` | `#!/bin/sh`, `#!/usr/bin/env sh`, `dash` | `.sh` with no shebang | `shell` |
| `bash` | `#!/bin/bash`, `#!/usr/bin/env bash` | `.bash`, `.bats` | `shell` |
| `lua` | | `.lua` | none |
| `python` | `python`, `python3` | `.py`, `.pyi` | none |
| `javascript` | `node` | `.js`, `.mjs`, `.cjs`, `.jsx` | none |
| `typescript` | `bun`, `deno`, `tsx` | `.ts`, `.mts`, `.cts`, `.tsx` | none |
| `rust` | | `.rs` | none |
| `swift` | | `.swift` | none |

The overlay is the file `<target>-<overlay>.md` beside a target's `<target>-rules.md`, for example
`references/naming-shell.md`. A language with no overlay, or a target that has no such file, uses
`<target>-rules.md` alone.

A file in no row is skipped. Say how many were skipped when that number is not zero.

To add a language, add a row. To give it rules of its own for one target, add the overlay file
`<target>-<overlay>.md` beside that target's rules.
