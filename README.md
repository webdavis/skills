# skills

Agent skills, each shipped as a Claude Code plugin so it installs the same way everywhere.

| Plugin | Skills | What it is for |
| --- | --- | --- |
| `clean-code` | `clean-code`, `clean-code-rust`, `clean-code-swift`, `bullshit-detector`, `depgraph` | The clean-code method for layered tools; the language skills own the numbers, so install the plugin whole. `bullshit-detector` finds code that says one thing and does another, such as a vague name or a script that claims sh but needs bash. `depgraph` draws a dependency diagram of the repository as a picture, runs only when you call it, and needs the `d2` program |
| `tiktok-crawling` | `tiktok-crawling` | TikTok crawling, metadata export and analysis with yt-dlp (based on RomneyDa's ClawHub skill) |
| `git` | `git`, `commit`, `amend`, `pr`, `merge`, `worktree`, `clean`, `conventional-commits` | Git and GitHub flows for an agent: `git` holds the rules for worktrees, commits, pull requests and merging and is the only skill a model loads on its own; the rest run when named. `conventional-commits` is the message spec the others read, so install the plugin whole |

## Install

Pick the route that fits your setup. Every skill lives at `plugins/<plugin>/skills/<skill>/SKILL.md`.

**Claude Code** (plugins, namespaced as `/<plugin>:<skill>`):

```sh
claude plugin marketplace add webdavis/skills
claude plugin install clean-code@webdavis
claude plugin install git@webdavis
```

**Codex** (same marketplace file):

```sh
codex plugin marketplace add webdavis/skills
codex plugin add clean-code@webdavis
codex plugin add git@webdavis
```

**skills CLI** (any agent it supports; the whole repo, one plugin, or one skill):

```sh
npx skills@latest add webdavis/skills
npx skills@latest add webdavis/skills/plugins/clean-code
npx skills@latest add webdavis/skills/plugins/tiktok-crawling/skills/tiktok-crawling
npx skills@latest add webdavis/skills/plugins/git
```

**Hermes Agent** (one skill at a time, by path):

```sh
hermes skills install webdavis/skills/plugins/clean-code/skills/clean-code
hermes skills install webdavis/skills/plugins/tiktok-crawling/skills/tiktok-crawling
hermes skills install webdavis/skills/plugins/git/skills/conventional-commits
```

## Turning on the `git` plugin's rules

Copy this line into an `AGENTS.md` (or `CLAUDE.md`) so agents load the `git` skill before any work:

```
Load the `git` skill before working in a git repository.
```

## Completing the `git` plugin's arguments

In omp and Claude Code the `git` plugin completes the arguments of its skills as you type, in the same popup that lists files after `@`. Move through it with Ctrl+N and Ctrl+P or the arrow keys, and pick with Tab. The list narrows to the names that hold what you typed.

| Command | Completes |
| --- | --- |
| `/worktree` | `list`, `delete`, `catchup`; local and GitHub branches to make a worktree for; worktrees after `delete` and `catchup`; `--branch`, `--remote`, `--with` and a branch after it |
| `/clean` | worktrees, local branches and GitHub branches |
| `/merge` | open pull requests; `--keep`, `--auto`, `--merge`, `--squash`, `--rebase`, `--policy` and `merge`, `squash` or `rebase` after it |
| `/pr` | `--draft`, `status`, `checkout`, `ready`, `close`, `reopen`; open pull requests after `status`, `checkout` and `close`, open drafts after `ready`, closed pull requests that were never merged after `reopen` |
| `/amend` | the branch's own commits since its base, newest first |
| `/commit` | `--policy`, then `tdd`, `guard` or `off`, then the repository's folders |
| `/git` | `on`, `off` |

GitHub branches are the ones git saw at the last fetch. Pull requests come from `gh` in the background and are kept for 30 seconds, so the first list after a while may show none; without `gh` none are shown. In the worktree lists, the worktree the agent last worked in comes first, marked `agent`.

omp names the skills `/skill:<name>`, and completes them there; its own `/worktree` command keeps omp's completion. Claude Code completes both `/<name>` and `/git:<name>`, from the first letter of an argument. Codex has no way for a plugin to complete arguments.

## Seeing which worktree the agent works in

When the agent reads, edits or runs a command in a worktree other than the session's own, the `git` plugin names that worktree on omp's status line, as in `worktree feat-shout`. A worktree of another repository shows that repository's name first (`worktree dotfiles › feat-install`), a branch that does not match the folder's name shows in brackets, and a worktree with no branch checked out shows its commit (`@1a2b3c4`). The line goes away when the agent is back in the session's own worktree or the worktree it named is removed. Claude Code shows the same text under its prompt, after its own `⚠ git:`.

To work on the completion code, run `bun install`, then `bun test`, `bun run check` and `bun run format:check` in `plugins/git`.
