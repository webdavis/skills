# Naming in sh and bash

Read with `naming-rules.md`. Only what differs for shell is here.

- **Case.** Functions and variables are `snake_case`. Constants set once with `readonly` keep the
  same lowercase style; all capitals is for variables the environment provides.
- **A getter prints its value.** A shell function cannot return text, so one that prints a value
  for the caller to capture is a `get_` function: `get_current_time`. One that prints for a person
  to read is an action: `report_withheld_lines`.
- **Yes/no tests become functions.** A bare test in an `if` can hide what is being asked. Flag one
  whose question a reader has to work out, such as `if [[ -t 1 ]]`, and propose a named function:
  `check_output_goes_to_a_terminal`. Leave one that reads as its own question, such as
  `((status != 0))`. The same goes for a `case` used only to answer yes or no.
- **Positional arguments get names.** Flag a function body that reads `$1` or `$2` more than once
  without naming it first: `local line=$1`.
- **A pattern in a command gets a variable.** A regular expression written inside `sed`, `grep` or
  `[[ =~ ]]` moves to a `readonly` variable ending in `_regex`.
- **Lines to leave alone.** The shebang, `# shellcheck` directives, and comment lines whose text a
  tool hashes to decide when a script re-runs (for example a chezmoi `run_onchange_` script's
  `# <label>: {{ ... | sha256sum }}` lines) are not explanations. Never flag or remove them.
