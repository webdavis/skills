import type { PullRequest, PullRequests } from "./pull-requests.js";
import type { Shell } from "./shell.js";

type GhPullRequest = {
  number: number;
  title: string;
  headRefName: string;
  mergedAt?: string | null;
  isDraft?: boolean;
};

function parsed(output: string): GhPullRequest[] {
  try {
    return JSON.parse(output);
  } catch {
    return [];
  }
}

function asPullRequest({ number, title, headRefName }: GhPullRequest): PullRequest {
  return { number, title, branch: headRefName };
}

export class GhPullRequests implements PullRequests {
  constructor(private readonly shell: Shell) {}

  async open(): Promise<PullRequest[]> {
    return parsed(await this.list("open", "number,title,headRefName")).map(asPullRequest);
  }

  async closedUnmerged(): Promise<PullRequest[]> {
    const closed = parsed(await this.list("closed", "number,title,headRefName,mergedAt"));
    return closed.filter(({ mergedAt }) => !mergedAt).map(asPullRequest);
  }

  async openDrafts(): Promise<PullRequest[]> {
    const open = parsed(await this.list("open", "number,title,headRefName,isDraft"));
    return open.filter(({ isDraft }) => isDraft).map(asPullRequest);
  }

  private list(state: string, fields: string): Promise<string> {
    return this.shell.run(["gh", "pr", "list", "--state", state, "--json", fields]);
  }
}
