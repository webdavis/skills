import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { ArgumentCompleter } from "./argument-completer.js";
import { BunShell } from "./bun-shell.js";
import { CachedPullRequests } from "./cached-pull-requests.js";
import { GhPullRequests } from "./gh-pull-requests.js";
import { GitRepository } from "./git-repository.js";
import { OmpAgentStatus } from "./omp-agent-status.js";
import { OmpAutocomplete } from "./omp-autocomplete.js";
import { PullRequestCache } from "./pull-request-cache.js";

// omp names a plugin's skills /skill:<name>, and its own /worktree command is not this plugin's.
const SKILL_COMMAND_PREFIXES = ["skill:"];

export default function gitExtension(pi: Pick<ExtensionAPI, "on">) {
  const cache = new PullRequestCache();
  const agentStatus = new OmpAgentStatus();
  agentStatus.register(pi);
  pi.on("session_start", (_event, ctx) => {
    ctx.ui.addAutocompleteProvider((ompsOwn) => {
      const shell = new BunShell(ctx.cwd);
      const repository = new GitRepository(shell);
      const pullRequests = new CachedPullRequests(cache, repository, new GhPullRequests(shell));
      const completer = new ArgumentCompleter(
        repository,
        pullRequests,
        SKILL_COMMAND_PREFIXES,
        () => agentStatus.lastBranch,
      );
      return new OmpAutocomplete(completer).wrap(ompsOwn);
    });
  });
}
