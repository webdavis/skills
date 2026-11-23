export interface Repository {
  root(): Promise<string>;
  localBranches(): Promise<string[]>;
  remoteBranches(): Promise<string[]>;
  worktrees(): Promise<string[]>;
  folders(): Promise<string[]>;
}
