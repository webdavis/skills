import type { Repository } from "./repository.js";
import type { Shell } from "./shell.js";

const BRANCH = "branch refs/heads/";

function lines(output: string): string[] {
  return output.split("\n").filter((line) => line !== "");
}

export class GitRepository implements Repository {
  constructor(private readonly shell: Shell) {}

  async localBranches(): Promise<string[]> {
    return lines(await this.git("for-each-ref", "--format=%(refname:short)", "refs/heads"));
  }

  async worktrees(): Promise<string[]> {
    const porcelain = lines(await this.git("worktree", "list", "--porcelain"));
    return porcelain.filter((line) => line.startsWith(BRANCH)).map((line) => line.slice(BRANCH.length));
  }

  private git(...args: string[]): Promise<string> {
    return this.shell.run(["git", ...args]);
  }
}
