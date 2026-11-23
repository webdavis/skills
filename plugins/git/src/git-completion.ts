import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { ArgumentCompleter } from "./argument-completer.js";
import { GitNames } from "./git-names.js";
import { OmpAutocomplete } from "./omp-autocomplete.js";
import { ShellGit } from "./shell-git.js";

export default function gitCompletionExtension(pi: Pick<ExtensionAPI, "on">) {
  pi.on("session_start", (_event, ctx) => {
    ctx.ui.addAutocompleteProvider((ompsOwn) =>
      new OmpAutocomplete(new ArgumentCompleter(new GitNames(new ShellGit(ctx.cwd)))).wrap(ompsOwn),
    );
  });
}
