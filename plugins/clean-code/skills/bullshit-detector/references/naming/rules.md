# Target: naming

A name is bullshit when a reader has to open the body to learn what the thing does, or when the body
does something the name does not say. A good name states the behavior, so the code documents itself
and no comment is needed.

These rules hold in every language. Spell them in the language's own case style
(`get_git_commit`, `getGitCommit`).

## What to flag

### A function's first word says what kind of function it is

| First word | Use it when | Example |
| --- | --- | --- |
| `check_` | It answers a yes/no question and either answer is fine. It is a fork in the road. | `check_output_goes_to_a_terminal` |
| `verify_` | It confirms something that should be true. A "no" is a problem, even one the code goes on to fix. | `verify_login_shell_is_set` |
| `get_` | It returns a value. | `get_current_time` |
| an action verb | It does something. | `write_redacted_log`, `run_apply_in_terminal` |

Flag a yes/no function with no prefix (`apply_succeeded`), and flag `check_` and `verify_` used the
wrong way round. To tell them apart, ask what happens on "no": if the code just takes the other
branch, it is `check_`; if "no" means something is wrong or must be put right, it is `verify_`.

A `check_` or `verify_` name reads as a statement that can be true or false: the subject, then what
is said of it. `verify_sudo_is_authenticated`, not `verify_sudo_authentication`.

A `verify_` name states the outcome that is wanted, not the fault being guarded against:
`verify_last_line_gets_logged`, not `verify_last_line_has_no_trailing_newline`.

Functions that do the same kind of thing start with the same verb: `run_apply_in_terminal` beside
`run_apply_through_a_pipe`, not `apply_through_a_pipe`.

### A variable says what it holds and ends with its kind

`chezmoi_apply_output_temp_file` tells a reader three things: whose output, that it is temporary,
and that it is a file. Flag a variable that leaves out any part a reader needs:

- **The kind is missing.** A path to a temporary file ends in `_temp_file`. A regular expression
  ends in `_regex`.
- **The owner is vague.** `apply_output` does not say which apply; `chezmoi_apply_output` does.
- **It is named for a stage, not a thing.** `unfiltered_capture` describes what has not happened to
  it yet. Name what it is.
- **An exit code is named for an action.** A constant holding an exit code names the condition it
  reports, after `exit_`: `exit_config_is_locked`, not `exit_waiting` or `exit_retry_later`. A second
  verb after `exit_` reads as a second action, so the reader cannot tell whether the program exits
  or does the other thing. Renaming the constant leaves the number callers see unchanged, so it is
  safe to flag.

### A regular expression ends in `_regex`

Lead with an action only when the command that uses it does not already imply one. `sed` can remove
or replace, so the name says which: `remove_carriage_return_regex`. A match test or `grep` can only
find, so `find_` adds nothing: `diff_block_header_regex`.

A regular expression buried inside a longer command string gets its own variable, so that the name
describes the pattern and not the whole command.

### The name needs one more word

Flag a name whose verb has no object, or whose noun could be anything: `track_diff_block` (tracks
what about it?), `git_answer` (which answer?), `filter_line` (filters it how?). The fix is usually
one more word: `track_position_in_diff_block`.

Words that are nearly always too vague on their own: `data`, `info`, `value`, `result`, `answer`,
`thing`, `item`, `handle`, `process`, `manage`, `do`, `tmp`, `raw`, `capture`.

### The name is more specific than its surroundings need

A word earns its place in a name only when it tells this thing apart from another thing the reader
can see. In a script that manages one program, every `daemon` and `binary` already means that
program, so `get_oldest_osqueryd_start_time` repeats what the file says and
`get_oldest_daemon_start_time` reads cleaner. Add the specific word back when the same scope holds a
second thing of that kind.

An abstract name also makes a function easier to reuse. When two functions differ only in the
specific word, propose one function that takes it as an argument.

### The name is a sentence

Flag a name that tries to carry the reason as well as the thing:
`only_program_so_cargo_ignores_those_a_plain_install_cannot_build`. A name says what the thing is.
The reason belongs in the commit message. Three to six words is the usual range.

### The name uses a soft word where a precise one exists

Use the term a reader would search for. `filter_terminal_escape_codes_from_output`, not
`get_output_without_color_codes`: the codes do more than color. `get_repo_name_from_origin_address`
says where the name comes from, which `repo_name` hides.

Plain words still beat insider jargon when the precise term is one few readers know: "diff block"
reads better than "hunk".

### One generic function stands in for several specific ones

Flag a function that takes an argument only to choose which of several unrelated things it returns.
`git_answer_or_unknown --short HEAD` and `git_answer_or_unknown --abbrev-ref HEAD` become
`get_git_commit` and `get_git_branch`, and the caller reads without decoding options.

### No honest short name exists

When the only accurate name needs "and", or lists cases, the function does more than one job. Say so
in the finding and propose the split: a function that decided what to log and also tracked the
position in a diff became `redact_line` and `track_position_in_diff_block`.

### A comment explains a name

Flag a comment that says what the next line or function does. The name should say it. Propose the
name that makes the comment unnecessary.

Leave alone a comment that a tool reads (a linter directive, a line a build tool hashes to decide
when to re-run) and a comment that records a reason the code cannot show.

### A message or error label claims what the code never checked

Text the program prints is a name for what just happened, and readers trust it the same way. Flag:

- **A success message the code has not earned.** `deployed` printed once `kubectl apply` returns,
  with no wait for the rollout. Propose wording that states only what the code knows
  (`manifest applied`), or point out the check that would earn it.
- **An error label used for a different failure.** `not-found` reported when the file exists but
  cannot be read. Propose a label for the failure that actually happened (`not-readable`), and keep
  the old label where it is still true.

Another program may match on an error label or exit message. Say so in the finding, so the owner
weighs that before choosing.

## What not to flag

- Names fixed by something outside the file: a public API, a command-line flag, a config key, a
  framework hook, a test framework's naming rule.
- Entry points whose name is a convention, such as `main`.
- Loop counters and other names whose whole life is three lines.
- A name that is merely long. Length is a fault only when the extra words carry the reason and not
  the thing.
- Style the language's formatter or linter already enforces.

## Proposing a name

Read the body first, then every place that calls it. The caller decides how specific the name must
be and whether "no" is a fork (`check_`) or a fault (`verify_`), so a name chosen from the body
alone is half a guess. Propose the name that states what the body does, in the fewest words that
leave nothing a reader needs out. Offer one name in the report. Offer three when fixing, and say what
a reader learns from each.

When two reasonable names differ only in whether they state the wanted outcome or the fault
prevented, recommend the wanted outcome.
