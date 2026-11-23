export interface Repository {
  localBranches(): Promise<string[]>;
  remoteBranches(): Promise<string[]>;
  worktrees(): Promise<string[]>;
  folders(): Promise<string[]>;
}
