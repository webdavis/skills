import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

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
    this.git("worktree", "add", "--quiet", "-b", branch, `${this.path}-${branch}`);
    return this;
  }

  detachedWorktree(): this {
    this.git("worktree", "add", "--quiet", "--detach", `${this.path}-detached`);
    return this;
  }

  onGitHub(...branches: string[]): this {
    const origin = `${this.path}-origin`;
    Bun.spawnSync(["git", "init", "--quiet", "--bare", origin]);
    this.git("remote", "add", "origin", origin);
    for (const branch of branches) this.git("push", "--quiet", "origin", `HEAD:refs/heads/${branch}`);
    this.git("fetch", "--quiet", "origin");
    this.git("remote", "set-head", "origin", branches[0]!);
    return this;
  }

  file(path: string): this {
    mkdirSync(join(this.path, dirname(path)), { recursive: true });
    writeFileSync(join(this.path, path), "");
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
