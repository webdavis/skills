import { ArgumentCompleter } from "../src/argument-completer.js";
import { GitRepository } from "../src/git-repository.js";

type Row = { text: string; label?: string; description?: string };
type Rows = { suggestions: Row[] };
type AutocompleteEvent = { text: string; cursor: number; token: string; start: number };
type Mods = { process: { run(argv: string[]): Promise<{ stdout: string }> } };
type Hook = ($: Mods, e: AutocompleteEvent, next: (e: AutocompleteEvent) => Promise<Rows>) => Promise<Rows>;

async function run($: Mods, argv: string[]): Promise<string> {
  try {
    return (await $.process.run(argv)).stdout;
  } catch {
    return "";
  }
}

const SKILL_COMMAND_PREFIXES = ["", "git:"];

// Claude Code loads a mod through the named register export, so this adapter cannot use a default export.
export function register(on: (event: "prompt.autocomplete", hook: Hook) => unknown) {
  on("prompt.autocomplete", async ($, e, next) => {
    const repository = new GitRepository({ run: (argv) => run($, argv) });
    const completer = new ArgumentCompleter(repository, SKILL_COMMAND_PREFIXES);
    const completion = await completer.complete(e.text.slice(0, e.cursor));
    const theirs = await next(e);
    const ours = completion?.suggestions.map(({ value, description }) => ({ text: value, description })) ?? [];
    return { suggestions: [...(theirs?.suggestions ?? []), ...ours] };
  });
}
