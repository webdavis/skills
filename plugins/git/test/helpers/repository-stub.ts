import type { Repository } from "../../src/repository.js";

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
}
