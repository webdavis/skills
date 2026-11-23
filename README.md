# skills

Agent skills, each shipped as a Claude Code plugin so it installs the same way everywhere.

| Plugin | Skills | What it is for |
| --- | --- | --- |
| `clean-code` | `clean-code`, `clean-code-rust`, `clean-code-swift`, `bullshit-detector`, `depgraph` | The clean-code method for layered tools; the language skills own the numbers, so install the plugin whole. `bullshit-detector` finds code that says one thing and does another, such as a vague name or a script that claims sh but needs bash. `depgraph` draws a dependency diagram of the repository as a picture, runs only when you call it, and needs the `d2` program |
| `tiktok-crawling` | `tiktok-crawling` | TikTok crawling, metadata export and analysis with yt-dlp (based on RomneyDa's ClawHub skill) |
| `git` | `commit`, `amend`, `pr`, `merge`, `conventional-commits` | Git and GitHub flows for an agent: one conventional commit at a time, pull requests through gh-axi; `conventional-commits` is the message spec the others read, so install the plugin whole |

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
