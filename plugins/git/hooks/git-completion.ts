import { folderOf } from "../src/agent-folder.js";
import { AgentWorktree } from "../src/agent-worktree.js";
import { ArgumentCompleter } from "../src/argument-completer.js";
import { CachedPullRequests } from "../src/cached-pull-requests.js";
import { GhPullRequests } from "../src/gh-pull-requests.js";
import { GitRepository } from "../src/git-repository.js";
import { PullRequestCache } from "../src/pull-request-cache.js";

type Row = { text: string; label?: string; description?: string };
type Rows = { suggestions: Row[] };
type AutocompleteEvent = { text: string; cursor: number; token: string; start: number };
type ToolCallEvent = { tool: string; command?: unknown; file_path?: unknown; notebook_path?: unknown };
type Mods = {
  process: { run(argv: string[]): Promise<{ stdout: string }> };
  ui: { status(text: string | undefined): void };
  env: { get(name: string): Promise<string | undefined> };
};
type Hook<Event, Result> = ($: Mods, e: Event, next: (e: Event) => Promise<Result>) => Promise<Result>;
type On = {
  (event: "prompt.autocomplete", hook: Hook<AutocompleteEvent, Rows>): unknown;
  (event: "session.start", hook: Hook<{ cwd: string }, unknown>): unknown;
  (event: "tool.call", hook: Hook<ToolCallEvent, unknown>): unknown;
};

const SKILL_COMMAND_PREFIXES = ["", "git:"];

async function run($: Mods, argv: string[]): Promise<string> {
  try {
    return (await $.process.run(argv)).stdout;
  } catch {
    return "";
  }
}

function text(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

// Claude Code loads a mod through the named register export, so this adapter cannot use a default export.
export function register(on: On) {
  const cache = new PullRequestCache();
  let session = { dir: "", home: "" };
  let agentWorktree: AgentWorktree | undefined;

  on("session.start", async ($, e, next) => {
    session = { dir: e.cwd, home: (await $.env.get("HOME")) ?? "" };
    agentWorktree = new AgentWorktree(e.cwd);
    $.ui.status(await agentWorktree.start({ run: (argv) => run($, argv) }));
    return next(e);
  });

  on("tool.call", async ($, e, next) => {
    const use = { command: text(e.command), path: text(e.file_path) ?? text(e.notebook_path) };
    const shown = await agentWorktree?.acted(folderOf(use, session.dir, session.home), { run: (argv) => run($, argv) });
    if (shown) $.ui.status(shown);
    return next(e);
  });

  on("prompt.autocomplete", async ($, e, next) => {
    const shell = { run: (argv: string[]) => run($, argv) };
    const repository = new GitRepository(shell);
    const pullRequests = new CachedPullRequests(cache, repository, new GhPullRequests(shell));
    const agentBranch = () => agentWorktree?.lastBranch;
    const completer = new ArgumentCompleter(repository, pullRequests, SKILL_COMMAND_PREFIXES, agentBranch);
    const completion = await completer.complete(e.text.slice(0, e.cursor));
    const theirs = await next(e);
    const ours = completion?.suggestions.map(({ value, label, description }) => ({ text: value, label, description }));
    return { suggestions: [...(theirs?.suggestions ?? []), ...(ours ?? [])] };
  });
}
