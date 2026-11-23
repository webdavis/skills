export interface Repository {
  localBranches(): Promise<string[]>;
  worktrees(): Promise<string[]>;
}
