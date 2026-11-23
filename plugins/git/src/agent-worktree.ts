import type { Shell } from "./shell.js";

interface Location {
  root: string;
  repository: string;
  branch?: string;
  commit?: string;
}

const MAIN_WORKTREE = /^worktree (.+)$/m;

function folderName(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

async function locate(dir: string, shell: Shell): Promise<Location | undefined> {
  const [root, branch] = (
    await shell.run(["git", "-C", dir, "rev-parse", "--show-toplevel", "--abbrev-ref", "HEAD"])
  ).split("\n");
  if (!root || !branch) return undefined;
  const mainWorktree = MAIN_WORKTREE.exec(await shell.run(["git", "-C", dir, "worktree", "list", "--porcelain"]));
  const repository = mainWorktree?.[1] ?? root;
  if (branch !== "HEAD") return { root, repository, branch };
  return { root, repository, commit: (await shell.run(["git", "-C", dir, "rev-parse", "--short", "HEAD"])).trim() };
}

export class AgentWorktree {
  private readonly locations = new Map<string, Location | undefined>();
  private session?: Location;
  private shown?: Location;

  constructor(private readonly sessionDir: string) {}

  get lastBranch(): string | undefined {
    return this.shown === this.session ? undefined : this.shown?.branch;
  }

  async start(shell: Shell): Promise<string | undefined> {
    this.session = await this.locate(this.sessionDir, shell);
    this.shown = this.session;
    return this.shown && this.describe(this.shown);
  }

  async acted(dir: string | undefined, shell: Shell): Promise<string | undefined> {
    const location = dir === undefined ? undefined : await this.locate(dir, shell);
    if (location && location.root !== this.shown?.root) return this.show(location);
    if (this.shown && this.shown !== this.session && !(await locate(this.shown.root, shell))) {
      return this.session && this.show(this.session);
    }
    return undefined;
  }

  private show(location: Location): string {
    this.shown = location.root === this.session?.root ? this.session : location;
    return this.describe(location);
  }

  private describe({ root, repository, branch, commit }: Location): string {
    const branchText = branch ? `branch ${branch}` : `branch detached at ${commit}`;
    if (root === this.session?.root) return `agent: this folder · ${branchText}`;
    const sameRepository = repository === this.session?.repository;
    const name = sameRepository ? folderName(root) : `${folderName(repository)}/${folderName(root)}`;
    return `agent worktree: ${name} · ${branchText}`;
  }

  private async locate(dir: string, shell: Shell): Promise<Location | undefined> {
    if (!this.locations.has(dir)) this.locations.set(dir, await locate(dir, shell));
    return this.locations.get(dir);
  }
}
