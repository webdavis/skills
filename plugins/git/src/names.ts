export interface Names {
  branches(): Promise<string[]>;
  worktrees(): Promise<string[]>;
}
