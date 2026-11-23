---
name: bullshit-detector
description: >-
  Find code that says one thing and does another, one target at a time. `naming` catches vague or
  misleading function and variable names, messages and error labels, and proposes better ones
  (check_, verify_ and get_ prefixes; _regex and _temp_file endings; names that state behavior so no
  comment is needed).
  `posix` catches scripts that claim sh but use bash. Use whenever a name has to be chosen, renamed
  or reviewed, a name feels vague or too long, a comment is being replaced by a name, a script's
  shebang is in doubt, or the request is `/clean-code:bullshit-detector [target] [lang:<name>]
  [path]`, even when the request only says "is this a good name" or "clean up these names". It
  reports and proposes; it changes nothing until asked.
compatibility: >-
  Needs git. The posix target uses ShellCheck when it is installed or can run through uvx or npx,
  and falls back to its own list otherwise.
---

# Bullshit detector

Bullshit, here, is code that claims one thing and does another: a name that hides what a function
does, a first line that says `sh` above a script that needs bash. Each kind is a **target** with its
own rules. The detector reports what it finds and proposes a fix. The owner chooses every change.

## Reading the request

```
bullshit-detector [target] [lang:<name>] [path...]
```

The words come in any order, and the shape of each word decides what it is:

| Shape | Meaning | Example |
| --- | --- | --- |
| bare word | the target | `naming` |
| `lang:<name>` | only files in that language | `lang:bash` |
| contains `/` or `.` | a path to look in | `scripts/`, `foo.sh`, `.` |

- **No target** runs every target.
- **No path** checks every tracked file in the repository (`git ls-files`).
- **No `lang:`** checks every language the target has rules for.

The targets are the `<target>-rules.md` files under `references/`:
[`naming`](references/naming-rules.md) and [`posix`](references/posix-rules.md). The languages are
the rows of [`references/languages.md`](references/languages.md); read it to map a file to its
language.

Stop and scan nothing when a word is not a known target, a known language, or an existing path, or
when two targets are given. Print the usage line and the valid targets and languages. A guess here
would report on the wrong thing and look like an answer, so never run on a guess. Naming the
closest valid word ("did you mean `naming`?") is fine, because nothing runs.

Open every run with one line that says how the request was read, so a misreading is caught at once.
It gives the target, the language when one was asked for, and the number of files that are in scope
after the path and language are applied:

```
naming · bash · 14 files
```

With no target, run each target in turn. Give each its own opening line and list, and keep the
numbering going across them so that `fix 4` means one finding.

Zero files is not an error. Say so in one line with the reason: no file is in that language, or the
target does not apply to it.

## Running a target

Read `references/<target>-rules.md`. It says what counts as bullshit for that target and how to find
it. When a file's language has an overlay named in `references/languages.md`, read that too; an
overlay holds only what differs for that language.

Judge names by reading the code they label. A name is only wrong relative to what the code does, so
a finding that was not checked against the body is a guess.

## The report

One numbered line per finding, in file and line order, at most 20. When there are more, say how many
were left out and suggest a narrower path.

```
naming · bash · 14 files

1. scripts/apply.sh:41   track_diff_block → track_position_in_diff_block   does not say what is tracked
2. scripts/apply.sh:15   unfiltered_capture → chezmoi_apply_output_temp_file   hides that it is a temp file
3. scripts/apply.sh:45   git_answer_or_unknown → get_git_commit, get_git_branch   one vague getter, two jobs

3 findings. Reply `fix` to go through them, or `fix 2` for one.
```

Each line carries the place, the name, one proposed replacement, and the reason in under ten words.
Report nothing else: no summary of what was fine, no restating the rules. When nothing is found, say
so in one line. One closing line may say which files were left out and why, when a reader would
otherwise expect them.

Change no file while reporting.

## Fixing, one at a time

When the owner replies `fix` or `fix <number>`, take one finding at a time and wait for an answer
before the next. A rename is a judgment the owner makes with the code in front of him; a batch of
renames, or a table of names without their code, gives him nothing to judge.

For each finding, in this order and no longer than this:

1. **Which one**: "Finding 2 of 5", and the name.
2. **Where it is**: the file and what that file is for, in one sentence.
3. **What this part does**: two or three plain sentences. No jargon the name itself is trying to
   avoid.
4. **The code**: the definition and one place it is used, with ` <-- this name` after the line
   that declares it.
5. **Three options** in a small table, each with what a reader learns from it.
6. **One recommendation** and its reason in a sentence.

Then stop and ask. Apply only the name he chooses, which may be his own. If he says he cannot judge,
the explanation in step 3 was not plain enough: explain the code again more simply, and do not pick
for him.

After he chooses, rename every use (callers, tests, stand-ins). Run the project's own check for that
file, its tests when it has them and its linter otherwise, and say in one line what passed. Then
show the next finding.

Keep each message short. When he asks a question, answer only that.
