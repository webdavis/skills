import { expect, test } from "bun:test";
import { GhPullRequests } from "../../src/gh-pull-requests.js";
import { ShellStub } from "../helpers/shell-stub.js";

const GH_OPEN_PULL_REQUESTS = JSON.stringify([
  { number: 12, title: "Add the login page", headRefName: "feature-login" },
  { number: 9, title: "Fix a typo", headRefName: "fix-typo" },
]);

test("open asks gh for the repository's open pull requests", async () => {
  const { sut, shell } = makeSUT(GH_OPEN_PULL_REQUESTS);

  await sut.open();

  expect(shell.messages).toEqual([["gh", "pr", "list", "--state", "open", "--json", "number,title,headRefName"]]);
});

test("open answers each pull request's number, title and branch", async () => {
  const { sut } = makeSUT(GH_OPEN_PULL_REQUESTS);

  expect(await sut.open()).toEqual([
    { number: 12, title: "Add the login page", branch: "feature-login" },
    { number: 9, title: "Fix a typo", branch: "fix-typo" },
  ]);
});

test("open answers nothing when gh is missing or fails", async () => {
  const { sut } = makeSUT("");

  expect(await sut.open()).toEqual([]);
});

function makeSUT(output: string) {
  const shell = new ShellStub(output);
  const sut = new GhPullRequests(shell);
  return { sut, shell };
}
