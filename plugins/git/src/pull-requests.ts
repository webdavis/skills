export interface PullRequest {
  number: number;
  title: string;
  branch: string;
}

export interface PullRequests {
  open(): Promise<PullRequest[]>;
}
