import { homedir } from "node:os";
import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";
import { folderOf, type ToolUse } from "./agent-folder.js";
import { AgentWorktree } from "./agent-worktree.js";
import { BunShell } from "./bun-shell.js";
import { formatWorktree } from "./worktree-label.js";

const STATUS_KEY = "git-agent-worktree";

type StatusContext = { ui: Pick<ExtensionContext["ui"], "setStatus" | "theme"> };

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
      await this.worktree.start(new BunShell(ctx.cwd));
      this.show(ctx);
    });
    pi.on("tool_call", async (event, ctx) => {
      const folder = folderOf(toolUseOf(event.input), ctx.cwd, homedir());
      if (await this.worktree?.acted(folder, new BunShell(ctx.cwd))) this.show(ctx);
    });
  }

  private show(ctx: StatusContext): void {
    const shown = this.worktree?.shown;
    const { theme } = ctx.ui;
    const style = { dim: (text: string) => theme.fg("dim", text), accent: (text: string) => theme.fg("accent", text) };
    ctx.ui.setStatus(STATUS_KEY, shown && formatWorktree(shown, style));
  }
}
