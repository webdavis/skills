# skills

Agent skills and Claude Code plugins.

- `plugins/strategy`: the three slice pipelines (open-loop, closed-loop, orchestrator-loop).
- `plugins/clean-code`: the clean-code architecture standard and its Rust and Swift bindings.
- `skills/tiktok-crawling`: TikTok crawling, content retrieval and analysis.

Install the plugins as the `webdavis` marketplace (`claude plugin marketplace add webdavis/skills`,
`codex plugin marketplace add webdavis/skills`); install single skills with
`npx skills@latest add webdavis/skills/<path>` or `hermes skills install webdavis/skills/<path>`.
