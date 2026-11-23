import type { PullRequest, PullRequests } from "./pull-requests.js";

const MAX_AGE_MS = 30_000;

interface Entry {
  pullRequests: PullRequest[];
  fetchedAt: number;
  refreshing: boolean;
}

export class PullRequestCache {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly now: () => number = Date.now) {}

  open(repository: string, github: PullRequests): PullRequest[] {
    const entry = this.entries.get(repository) ?? { pullRequests: [], fetchedAt: -Infinity, refreshing: false };
    this.entries.set(repository, entry);
    if (!entry.refreshing && this.now() - entry.fetchedAt >= MAX_AGE_MS) void this.refresh(entry, github);
    return entry.pullRequests;
  }

  private async refresh(entry: Entry, github: PullRequests): Promise<void> {
    entry.refreshing = true;
    try {
      entry.pullRequests = await github.open();
      entry.fetchedAt = this.now();
    } catch {
      // The cached pull requests stay until GitHub answers again.
    } finally {
      entry.refreshing = false;
    }
  }
}
