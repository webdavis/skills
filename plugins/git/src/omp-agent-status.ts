import { homedir } from "node:os";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { folderOf, type ToolUse } from "./agent-folder.js";
import { AgentWorktree } from "./agent-worktree.js";
import { BunShell } from "./bun-shell.js";

const STATUS_KEY = "git-agent-worktree";

function text(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function toolUseOf(input: object): ToolUse {
  const { cwd, command, path, input: patch } = input as Record<string, unknown>;
  return { cwd: text(cwd), command: text(command), path: text(path), patch: text(patch) };
}

export class OmpAgentStatus {
  private worktree?: AgentWorktree;

  get lastBranch(): string | undefined {
    return this.worktree?.lastBranch;
  }

  register(pi: Pick<ExtensionAPI, "on">): void {
    pi.on("session_start", async (_event, ctx) => {
      this.worktree = new AgentWorktree(ctx.cwd);
      ctx.ui.setStatus(STATUS_KEY, await this.worktree.start(new BunShell(ctx.cwd)));
    });
    pi.on("tool_call", async (event, ctx) => {
      const folder = folderOf(toolUseOf(event.input), ctx.cwd, homedir());
      const shown = await this.worktree?.acted(folder, new BunShell(ctx.cwd));
      if (shown) ctx.ui.setStatus(STATUS_KEY, shown);
    });
  }
}
