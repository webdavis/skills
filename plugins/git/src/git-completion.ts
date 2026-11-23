import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { ArgumentCompleter } from "./argument-completer.js";
import { BunShell } from "./bun-shell.js";
import { GitRepository } from "./git-repository.js";
import { OmpAutocomplete } from "./omp-autocomplete.js";

// omp names a plugin's skills /skill:<name>, and its own /worktree command is not this plugin's.
const SKILL_COMMAND_PREFIXES = ["skill:"];

export default function gitCompletionExtension(pi: Pick<ExtensionAPI, "on">) {
  pi.on("session_start", (_event, ctx) => {
    ctx.ui.addAutocompleteProvider((ompsOwn) => {
      const completer = new ArgumentCompleter(new GitRepository(new BunShell(ctx.cwd)), SKILL_COMMAND_PREFIXES);
      return new OmpAutocomplete(completer).wrap(ompsOwn);
    });
  });
}
