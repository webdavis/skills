import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { ArgumentCompleter } from "./argument-completer.ts";
import { GitNames } from "./git-names.ts";
import { OmpAutocomplete } from "./omp-autocomplete.ts";
import { ShellGit } from "./shell-git.ts";

export default function gitCompletionExtension(pi: Pick<ExtensionAPI, "on">) {
  pi.on("session_start", (_event, ctx) => {
    ctx.ui.addAutocompleteProvider((ompsOwn) =>
      new OmpAutocomplete(new ArgumentCompleter(new GitNames(new ShellGit(ctx.cwd)))).wrap(ompsOwn),
    );
  });
}
