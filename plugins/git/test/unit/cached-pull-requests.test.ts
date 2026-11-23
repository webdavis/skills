import { expect, test } from "bun:test";
import { CachedPullRequests } from "../../src/cached-pull-requests.js";
import { PullRequestCache } from "../../src/pull-request-cache.js";
import { PullRequestsSpy } from "../helpers/pull-requests-spy.js";
import { RepositoryStub } from "../helpers/repository-stub.js";

const LOGIN = { number: 12, title: "Add the login page", branch: "feature-login" };
const THEME = { number: 7, title: "Try a new theme", branch: "theme" };

test("open answers nothing at once and asks GitHub in the background", async () => {
  const { sut, github } = makeSUT();

  expect(await sut.open()).toEqual([]);
  expect(github.messages).toEqual(["open"]);
});

test("open answers the pull requests GitHub gave for the repository once they arrive", async () => {
  const { sut, github, cache } = makeSUT();
  await sut.open();

  await github.answer([LOGIN]);

  expect(await sut.open()).toEqual([LOGIN]);
  expect(cache.read(`${new RepositoryStub().rootPath} open`, () => github.open())).toEqual([LOGIN]);
});

test("closedUnmerged keeps the closed pull requests apart from the open ones", async () => {
  const { sut, github } = makeSUT();
  await sut.open();
  await github.answer([LOGIN]);

  expect(await sut.closedUnmerged()).toEqual([]);
  await github.answer([THEME]);

  expect(await sut.closedUnmerged()).toEqual([THEME]);
  expect(await sut.open()).toEqual([LOGIN]);
  expect(github.messages).toEqual(["open", "closedUnmerged"]);
});

function makeSUT() {
  const cache = new PullRequestCache(() => 0);
  const github = new PullRequestsSpy();
  const sut = new CachedPullRequests(cache, new RepositoryStub(), github);
  return { sut, github, cache };
}
