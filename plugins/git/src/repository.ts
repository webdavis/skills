export interface Commit {
  sha: string;
  subject: string;
}

export interface Repository {
  root(): Promise<string>;
  localBranches(): Promise<string[]>;
  remoteBranches(): Promise<string[]>;
  worktrees(): Promise<string[]>;
  folders(): Promise<string[]>;
  branchCommits(): Promise<Commit[]>;
}
