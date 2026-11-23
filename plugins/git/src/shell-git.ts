import { $ } from "bun";
import type { Git } from "./git.js";

export class ShellGit implements Git {
  constructor(private readonly cwd: string) {}

  run(args: string[]): Promise<string> {
    return $`git ${args}`.cwd(this.cwd).quiet().nothrow().text();
  }
}
