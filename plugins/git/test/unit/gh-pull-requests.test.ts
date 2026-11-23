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

const GH_CLOSED_PULL_REQUESTS = JSON.stringify([
  { number: 7, title: "Try a new theme", headRefName: "theme", mergedAt: null },
  { number: 5, title: "Add the footer", headRefName: "footer", mergedAt: "2026-11-01T10:00:00Z" },
]);

test("closedUnmerged asks gh for the repository's closed pull requests with when each was merged", async () => {
  const { sut, shell } = makeSUT(GH_CLOSED_PULL_REQUESTS);

  await sut.closedUnmerged();

  expect(shell.messages).toEqual([
    ["gh", "pr", "list", "--state", "closed", "--json", "number,title,headRefName,mergedAt"],
  ]);
});

test("closedUnmerged answers only the closed pull requests that were never merged", async () => {
  const { sut } = makeSUT(GH_CLOSED_PULL_REQUESTS);

  expect(await sut.closedUnmerged()).toEqual([{ number: 7, title: "Try a new theme", branch: "theme" }]);
});

test("closedUnmerged answers nothing when gh is missing or fails", async () => {
  const { sut } = makeSUT("");

  expect(await sut.closedUnmerged()).toEqual([]);
});

const GH_OPEN_WITH_DRAFTS = JSON.stringify([
  { number: 15, title: "Sketch the settings page", headRefName: "settings", isDraft: true },
  { number: 12, title: "Add the login page", headRefName: "feature-login", isDraft: false },
]);

test("openDrafts asks gh for the open pull requests and whether each is a draft", async () => {
  const { sut, shell } = makeSUT(GH_OPEN_WITH_DRAFTS);

  await sut.openDrafts();

  expect(shell.messages).toEqual([
    ["gh", "pr", "list", "--state", "open", "--json", "number,title,headRefName,isDraft"],
  ]);
});

test("openDrafts answers only the drafts", async () => {
  const { sut } = makeSUT(GH_OPEN_WITH_DRAFTS);

  expect(await sut.openDrafts()).toEqual([{ number: 15, title: "Sketch the settings page", branch: "settings" }]);
});

function makeSUT(output: string) {
  const shell = new ShellStub(output);
  const sut = new GhPullRequests(shell);
  return { sut, shell };
}
