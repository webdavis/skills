import type { Git } from "./git.ts";
import type { Names } from "./names.ts";

const BRANCH = "branch refs/heads/";

function lines(output: string): string[] {
  return output.split("\n").filter((line) => line !== "");
}

export class GitNames implements Names {
  constructor(private readonly git: Git) {}

  async branches(): Promise<string[]> {
    return lines(await this.git.run(["for-each-ref", "--format=%(refname:short)", "refs/heads"]));
  }

  async worktrees(): Promise<string[]> {
    const porcelain = lines(await this.git.run(["worktree", "list", "--porcelain"]));
    return porcelain.filter((line) => line.startsWith(BRANCH)).map((line) => line.slice(BRANCH.length));
  }
}
