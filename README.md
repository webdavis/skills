# skills

Agent skills, each shipped as a Claude Code plugin so it installs the same way everywhere.

| Plugin | Skills | What it is for |
| --- | --- | --- |
| `strategy` | `open-loop`, `closed-loop`, `orchestrator-loop`, `ledger` | Three slice pipelines and the ledger scripts that gate their merges; install the plugin whole, the loops read `../ledger/` |
| `clean-code` | `clean-code`, `clean-code-rust`, `clean-code-swift` | The clean-code method for layered tools; the language skills own the numbers, so install the plugin whole |
| `tiktok-crawling` | `tiktok-crawling` | TikTok crawling, metadata export and analysis with yt-dlp (based on RomneyDa's ClawHub skill) |

## Install

Pick the route that fits your setup. Every skill lives at `plugins/<plugin>/skills/<skill>/SKILL.md`.

**Claude Code** (plugins, namespaced as `/<plugin>:<skill>`):

```sh
claude plugin marketplace add webdavis/skills
claude plugin install clean-code@webdavis
```

**Codex** (same marketplace file):

```sh
codex plugin marketplace add webdavis/skills
codex plugin add clean-code@webdavis
```

**skills CLI** (any agent it supports; the whole repo, one plugin, or one skill):

```sh
npx skills@latest add webdavis/skills
npx skills@latest add webdavis/skills/plugins/clean-code
npx skills@latest add webdavis/skills/plugins/tiktok-crawling/skills/tiktok-crawling
```

**Hermes Agent** (one skill at a time, by path):

```sh
hermes skills install webdavis/skills/plugins/clean-code/skills/clean-code
hermes skills install webdavis/skills/plugins/tiktok-crawling/skills/tiktok-crawling
```
