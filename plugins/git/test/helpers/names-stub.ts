import type { Names } from "../../src/names.js";

export class NamesStub implements Names {
  async worktrees(): Promise<string[]> {
    return ["main", "feature-b"];
  }

  async branches(): Promise<string[]> {
    return ["feature-a", "feature-b", "main"];
  }
}
