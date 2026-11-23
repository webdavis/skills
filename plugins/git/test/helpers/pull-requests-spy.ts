import type { PullRequest, PullRequests } from "../../src/pull-requests.js";

export class PullRequestsSpy implements PullRequests {
  readonly messages: string[] = [];
  private readonly answers: PromiseWithResolvers<PullRequest[]>[] = [];

  open(): Promise<PullRequest[]> {
    return this.ask("open");
  }

  closedUnmerged(): Promise<PullRequest[]> {
    return this.ask("closedUnmerged");
  }

  openDrafts(): Promise<PullRequest[]> {
    return this.ask("openDrafts");
  }

  private ask(message: string): Promise<PullRequest[]> {
    this.messages.push(message);
    const answer = Promise.withResolvers<PullRequest[]>();
    this.answers.push(answer);
    return answer.promise;
  }

  async answer(pullRequests: PullRequest[]): Promise<void> {
    this.answers.shift()?.resolve(pullRequests);
    await Bun.sleep(0);
  }

  async fail(): Promise<void> {
    this.answers.shift()?.reject(new Error("GitHub cannot be reached"));
    await Bun.sleep(0);
  }
}
