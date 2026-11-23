import type { Commit, Repository } from "../../src/repository.js";

export class RepositoryStub implements Repository {
  readonly rootPath = "/a/repo";

  async root(): Promise<string> {
    return this.rootPath;
  }

  async worktrees(): Promise<string[]> {
    return ["main", "feature-b"];
  }

  async localBranches(): Promise<string[]> {
    return ["feature-a", "feature-b", "main"];
  }

  async remoteBranches(): Promise<string[]> {
    return ["feature-a", "main", "feature-g"];
  }

  async folders(): Promise<string[]> {
    return ["docs", "src", "src/app"];
  }

  async branchCommits(): Promise<Commit[]> {
    return [
      { sha: "1a2b3c4", subject: "Fix the label" },
      { sha: "5d6e7f8", subject: "Add the form" },
    ];
  }
}
