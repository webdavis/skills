import type { PullRequest, PullRequests } from "../../src/pull-requests.js";

export class PullRequestsStub implements PullRequests {
  async open(): Promise<PullRequest[]> {
    return [
      { number: 12, title: "Add the login page", branch: "feature-login" },
      { number: 9, title: "Fix a typo", branch: "fix-typo" },
    ];
  }
}
