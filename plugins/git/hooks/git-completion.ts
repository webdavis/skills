import { ArgumentCompleter } from "../src/argument-completer.js";
import { CachedPullRequests } from "../src/cached-pull-requests.js";
import { GhPullRequests } from "../src/gh-pull-requests.js";
import { GitRepository } from "../src/git-repository.js";
import { PullRequestCache } from "../src/pull-request-cache.js";

type Row = { text: string; label?: string; description?: string };
type Rows = { suggestions: Row[] };
type AutocompleteEvent = { text: string; cursor: number; token: string; start: number };
type Mods = { process: { run(argv: string[]): Promise<{ stdout: string }> } };
type Hook = ($: Mods, e: AutocompleteEvent, next: (e: AutocompleteEvent) => Promise<Rows>) => Promise<Rows>;

const SKILL_COMMAND_PREFIXES = ["", "git:"];

async function run($: Mods, argv: string[]): Promise<string> {
  try {
    return (await $.process.run(argv)).stdout;
  } catch {
    return "";
  }
}

// Claude Code loads a mod through the named register export, so this adapter cannot use a default export.
export function register(on: (event: "prompt.autocomplete", hook: Hook) => unknown) {
  const cache = new PullRequestCache();
  on("prompt.autocomplete", async ($, e, next) => {
    const shell = { run: (argv: string[]) => run($, argv) };
    const repository = new GitRepository(shell);
    const pullRequests = new CachedPullRequests(cache, repository, new GhPullRequests(shell));
    const completer = new ArgumentCompleter(repository, pullRequests, SKILL_COMMAND_PREFIXES);
    const completion = await completer.complete(e.text.slice(0, e.cursor));
    const theirs = await next(e);
    const ours = completion?.suggestions.map(({ value, label, description }) => ({ text: value, label, description }));
    return { suggestions: [...(theirs?.suggestions ?? []), ...(ours ?? [])] };
  });
}
