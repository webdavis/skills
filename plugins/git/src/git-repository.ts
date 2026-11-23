import type { Repository } from "./repository.js";
import type { Shell } from "./shell.js";

const BRANCH = "branch refs/heads/";

function lines(output: string): string[] {
  return output.split("\n").filter((line) => line !== "");
}

function foldersAbove(file: string): string[] {
  const parts = file.split("/").slice(0, -1);
  return parts.map((_part, index) => parts.slice(0, index + 1).join("/"));
}

export class GitRepository implements Repository {
  constructor(private readonly shell: Shell) {}

  async localBranches(): Promise<string[]> {
    return lines(await this.git("for-each-ref", "--format=%(refname:short)", "refs/heads"));
  }

  async remoteBranches(): Promise<string[]> {
    const branches = lines(await this.git("for-each-ref", "--format=%(refname:lstrip=3)", "refs/remotes/origin"));
    return branches.filter((branch) => branch !== "HEAD");
  }

  async worktrees(): Promise<string[]> {
    const porcelain = lines(await this.git("worktree", "list", "--porcelain"));
    return porcelain.filter((line) => line.startsWith(BRANCH)).map((line) => line.slice(BRANCH.length));
  }

  async folders(): Promise<string[]> {
    const files = lines(await this.git("ls-files", "--cached", "--others", "--exclude-standard"));
    return [...new Set(files.flatMap(foldersAbove))].sort();
  }

  async root(): Promise<string> {
    return (await this.git("rev-parse", "--show-toplevel")).trim();
  }

  private git(...args: string[]): Promise<string> {
    return this.shell.run(["git", ...args]);
  }
}
