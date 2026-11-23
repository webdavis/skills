import type { Shell } from "./shell.js";
import type { WorktreeLabel } from "./worktree-label.js";

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
  const toplevel = await shell.run(["git", "-C", dir, "rev-parse", "--show-toplevel", "--abbrev-ref", "HEAD"]);
  const [root, branch] = toplevel.split("\n");
  if (!root || !branch) return undefined;
  const mainWorktree = MAIN_WORKTREE.exec(await shell.run(["git", "-C", dir, "worktree", "list", "--porcelain"]));
  const repository = mainWorktree?.[1] ?? root;
  if (branch !== "HEAD") return { root, repository, branch };
  return { root, repository, commit: (await shell.run(["git", "-C", dir, "rev-parse", "--short", "HEAD"])).trim() };
}

export class AgentWorktree {
  private readonly locations = new Map<string, Location | undefined>();
  private session?: Location;
  private current?: Location;

  constructor(private readonly sessionDir: string) {}

  get shown(): WorktreeLabel | undefined {
    const location = this.current;
    if (!location || location.root === this.session?.root) return undefined;
    const label: WorktreeLabel = { name: folderName(location.root) };
    if (location.repository !== this.session?.repository) label.repository = folderName(location.repository);
    if (location.branch) label.branch = location.branch;
    if (location.commit) label.commit = location.commit;
    return label;
  }

  get lastBranch(): string | undefined {
    return this.shown && this.current?.branch;
  }

  async start(shell: Shell): Promise<void> {
    this.session = await this.locate(this.sessionDir, shell);
    this.current = this.session;
  }

  async acted(dir: string | undefined, shell: Shell): Promise<boolean> {
    const location = dir === undefined ? undefined : await this.locate(dir, shell);
    if (location && location.root !== this.current?.root) return this.move(location);
    if (this.shown && !(await locate(this.current!.root, shell))) return this.move(this.session);
    return false;
  }

  private move(location: Location | undefined): boolean {
    this.current = location;
    return true;
  }

  private async locate(dir: string, shell: Shell): Promise<Location | undefined> {
    if (!this.locations.has(dir)) this.locations.set(dir, await locate(dir, shell));
    return this.locations.get(dir);
  }
}
