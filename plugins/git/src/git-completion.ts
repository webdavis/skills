import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { ArgumentCompleter } from "./argument-completer.js";
import { BunShell } from "./bun-shell.js";
import { GitRepository } from "./git-repository.js";
import { OmpAutocomplete } from "./omp-autocomplete.js";

export default function gitCompletionExtension(pi: Pick<ExtensionAPI, "on">) {
  pi.on("session_start", (_event, ctx) => {
    ctx.ui.addAutocompleteProvider((ompsOwn) =>
      new OmpAutocomplete(new ArgumentCompleter(new GitRepository(new BunShell(ctx.cwd)))).wrap(ompsOwn),
    );
  });
}
