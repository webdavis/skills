# Target: posix

A script whose first line says `sh` promises to run under any POSIX shell. It is bullshit when the
body uses features only bash has: it will work on one machine and fail on another.

This target applies to `lang:sh` files only. A script that says `bash` makes no such promise and is
skipped.

## Finding it

Use ShellCheck when it can be had without installing anything. It knows the POSIX rules exactly;
working them out from memory is slower and misses some. Take the first of these that works:

1. `shellcheck`, when it is on the PATH.
2. `uvx --from shellcheck-py==0.11.0.1 shellcheck`, when `uvx` is on the PATH.
3. `npx -y shellcheck@4.1.0`, when `npx` is on the PATH.

The second and third are third-party wrappers that download ShellCheck itself on first run. Keep
their versions pinned as written, so that a later release never runs on someone's machine unasked.

```sh
<shellcheck command> --shell=sh --format=gcc <file>
```

Keep two kinds of finding:

- A code in the SC3000 range, where ShellCheck reports "In POSIX sh, ... is undefined".
- Any other finding whose message says "non-standard", such as SC2112 and SC2113 for the `function`
  keyword.

Ignore the rest; they belong to the project's own lint.

### Without ShellCheck

When none of the three works, never ask the owner to install anything. Read each script for the
bash-only features below, and add `without shellcheck, may miss some` to the opening line so the
report does not claim more than it checked:

```
posix · sh · 3 files · without shellcheck, may miss some
```

| Bash-only | POSIX form |
| --- | --- |
| `[[ ... ]]` | `[ ... ]` |
| arrays: `a=(x y)`, `${a[0]}`, `${#a[@]}` | `set -- x y`, `$1`, `$#` |
| `function name { ...; }` | `name() { ...; }` |
| `local` | no portable form; a subshell or a unique variable name |
| `((...))`, `let` | `$((...))` inside `[ ... ]` |
| `<<<` here-string | `printf '%s\n' ... \|` |
| `<(...)`, `>(...)` | a temporary file or a pipe |
| `source file` | `. file` |
| `echo -e`, `echo -n` | `printf` |
| `${var//a/b}`, `${var:0:3}`, `${var^^}` | `sed`, `cut`, `tr` |
| `$RANDOM`, `$BASH_SOURCE`, `$PIPESTATUS`, `$SECONDS` | none |
| `&>`, `\|&` | `> file 2>&1`, `2>&1 \|` |
| `set -o pipefail` | none in older shells |
| `read -a`, `read -p`, `mapfile`, `readarray` | `read` with `IFS` |
| `==` inside `[ ... ]` | `=` |

## The report line

Give the place, the feature, and the fix, for example:

```
1. bin/setup.sh:12   [[ ... ]] is bash-only → change the first line to bash   SC3010
```

A script with several findings gets one line: name the first and count the rest.

## The fix

There are two honest fixes, and the owner chooses:

1. **Say `bash`.** Change the first line to `#!/usr/bin/env bash`. This is right when the script only
   ever runs where bash exists, which is the usual case. Recommend it by default.
2. **Make it portable.** Rewrite each flagged line in POSIX sh. This is right only when the script
   must run where bash may be missing, such as a first-boot installer or a container entry point.

When fixing, show the flagged lines and say which fix is recommended and why. After a change, run the
same check again and report that the bash-only findings are gone.
