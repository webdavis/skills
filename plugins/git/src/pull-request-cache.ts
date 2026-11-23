import type { PullRequest } from "./pull-requests.js";

const MAX_AGE_MS = 30_000;

interface Entry {
  pullRequests: PullRequest[];
  fetchedAt: number;
  refreshing: boolean;
}

export class PullRequestCache {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly now: () => number = Date.now) {}

  read(key: string, load: () => Promise<PullRequest[]>): PullRequest[] {
    const entry = this.entries.get(key) ?? { pullRequests: [], fetchedAt: -Infinity, refreshing: false };
    this.entries.set(key, entry);
    if (!entry.refreshing && this.now() - entry.fetchedAt >= MAX_AGE_MS) void this.refresh(entry, load);
    return entry.pullRequests;
  }

  private async refresh(entry: Entry, load: () => Promise<PullRequest[]>): Promise<void> {
    entry.refreshing = true;
    try {
      entry.pullRequests = await load();
      entry.fetchedAt = this.now();
    } catch {
      // The cached pull requests stay until GitHub answers again.
    } finally {
      entry.refreshing = false;
    }
  }
}
