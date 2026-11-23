import { $ } from "bun";
import type { Shell } from "./shell.js";

export class BunShell implements Shell {
  constructor(private readonly cwd: string) {}

  run(argv: string[]): Promise<string> {
    return $`${argv}`.cwd(this.cwd).quiet().nothrow().text();
  }
}
