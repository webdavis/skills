import type { PullRequestCache } from "./pull-request-cache.js";
import type { PullRequest, PullRequests } from "./pull-requests.js";
import type { Repository } from "./repository.js";

export class CachedPullRequests implements PullRequests {
  constructor(
    private readonly cache: PullRequestCache,
    private readonly repository: Repository,
    private readonly github: PullRequests,
  ) {}

  async open(): Promise<PullRequest[]> {
    return this.cache.read(`${await this.repository.root()} open`, () => this.github.open());
  }

  async closedUnmerged(): Promise<PullRequest[]> {
    return this.cache.read(`${await this.repository.root()} closed unmerged`, () => this.github.closedUnmerged());
  }
}
