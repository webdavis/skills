import type { PullRequest, PullRequests } from "./pull-requests.js";
import type { Shell } from "./shell.js";

type GhPullRequest = { number: number; title: string; headRefName: string };

export class GhPullRequests implements PullRequests {
  constructor(private readonly shell: Shell) {}

  async open(): Promise<PullRequest[]> {
    const output = await this.shell.run(["gh", "pr", "list", "--state", "open", "--json", "number,title,headRefName"]);
    try {
      const listed: GhPullRequest[] = JSON.parse(output);
      return listed.map(({ number, title, headRefName }) => ({ number, title, branch: headRefName }));
    } catch {
      return [];
    }
  }
}
