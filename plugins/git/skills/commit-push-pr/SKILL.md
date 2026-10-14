---
name: commit-push-pr
description: Commit, push the branch, and open a pull request through gh-axi with a reviewed body.
allowed-tools:
  - Bash(git status:*)
  - Bash(git diff:*)
  - Bash(git add:*)
  - Bash(git commit:*)
  - Bash(git push:*)
  - Bash(git switch:*)
  - Bash(git branch:*)
  - Bash(git log:*)
  - Bash(git rev-parse:*)
  - Bash(npx -y gh-axi:*)
  - Skill
  - Read
  - Write
---

# Commit, Push, PR

Commit the current work, push the branch, and open a pull request. This skill chains two others in
this plugin: `commit` makes the commit and `pr` owns the pull request body, its review and the
posting, so the template lives in one place. Every GitHub operation runs through `npx -y gh-axi`.
The bare `gh` CLI is never invoked directly; it exists only as gh-axi's runtime dependency.

## Steps

1. Run `git rev-parse --abbrev-ref HEAD`. When the branch is `main`, create a topic branch first with
   `git switch -c <type>/<short-slug>` named after the change. Never commit to `main`.
1. Follow the steps in `${CLAUDE_PLUGIN_ROOT}/skills/commit/SKILL.md` (outside Claude Code,
   `../commit/SKILL.md` beside this skill): one logical unit staged by path, one conventional
   commit, no co-author or "Generated with" trailer.
1. Push with `git push -u origin <branch>`.
1. Follow `${CLAUDE_PLUGIN_ROOT}/skills/pr/SKILL.md` (outside Claude Code, `../pr/SKILL.md`) from its
   drafting step onward. The body template, the review of the draft and the `gh-axi pr create` call
   all live there. Its checks for a dirty tree and unpushed commits are already satisfied by the
   steps above.

## Safeguards

- Never push to `main`, and never force-push to `main` under any circumstances.
- A force-push to a topic branch uses `--force-with-lease`, never `--force`, and needs
  per-invocation confirmation from the operator. A yes given earlier does not carry over.
- If a hook rejects the commit or the push, report its output verbatim and stop. Never retry with
  `--no-verify`.
- Do not merge the pull request. Opening it is where this skill stops.
