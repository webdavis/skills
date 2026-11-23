import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export class ScratchRepo {
  readonly path = realpathSync(mkdtempSync(join(tmpdir(), "git-completion-")));

  constructor() {
    this.git("init", "--quiet", "--initial-branch=main");
    this.git(
      "-c",
      "user.name=test",
      "-c",
      "user.email=test@example.com",
      "commit",
      "--quiet",
      "--allow-empty",
      "-m",
      "start",
    );
  }

  branch(name: string): this {
    this.git("branch", name);
    return this;
  }

  worktree(branch: string): this {
    this.git(
      "worktree",
      "add",
      "--quiet",
      "-b",
      branch,
      join(this.path, "..", `${this.path.split("/").pop()}-${branch}`),
    );
    return this;
  }

  private git(...args: string[]): void {
    const result = Bun.spawnSync(["git", ...args], { cwd: this.path });
    if (result.exitCode !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
  }
}

export function notARepository(): string {
  return realpathSync(mkdtempSync(join(tmpdir(), "not-a-repo-")));
}
