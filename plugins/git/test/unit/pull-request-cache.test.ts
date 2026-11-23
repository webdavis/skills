import { expect, test } from "bun:test";
import { PullRequestCache } from "../../src/pull-request-cache.js";
import { PullRequestsSpy } from "../helpers/pull-requests-spy.js";

const LOGIN = { number: 12, title: "Add the login page", branch: "feature-login" };
const TYPO = { number: 9, title: "Fix a typo", branch: "fix-typo" };

test("open answers nothing at once and asks GitHub in the background", () => {
  const { sut, github } = makeSUT();

  expect(sut.open("/a/repo", github)).toEqual([]);
  expect(github.messages).toEqual(["open"]);
});

test("open answers the pull requests GitHub gave once they arrive", async () => {
  const { sut, github } = makeSUT();
  sut.open("/a/repo", github);

  await github.answer([LOGIN]);

  expect(sut.open("/a/repo", github)).toEqual([LOGIN]);
});

test("open asks GitHub only once while an answer is on its way", () => {
  const { sut, github } = makeSUT();

  sut.open("/a/repo", github);
  sut.open("/a/repo", github);

  expect(github.messages).toEqual(["open"]);
});

test("open answers from the cache without asking GitHub again for 30 seconds", async () => {
  const { sut, github, clock } = makeSUT();
  sut.open("/a/repo", github);
  await github.answer([LOGIN]);
  clock.now += 29_999;

  expect(sut.open("/a/repo", github)).toEqual([LOGIN]);
  expect(github.messages).toEqual(["open"]);
});

test("open answers the cached pull requests and asks GitHub again after 30 seconds", async () => {
  const { sut, github, clock } = makeSUT();
  sut.open("/a/repo", github);
  await github.answer([LOGIN]);
  clock.now += 30_000;

  expect(sut.open("/a/repo", github)).toEqual([LOGIN]);
  await github.answer([LOGIN, TYPO]);

  expect(sut.open("/a/repo", github)).toEqual([LOGIN, TYPO]);
});

test("open keeps each repository's pull requests apart", async () => {
  const { sut, github } = makeSUT();
  sut.open("/a/repo", github);
  await github.answer([LOGIN]);

  expect(sut.open("/another/repo", github)).toEqual([]);
});

test("open keeps the cached pull requests when GitHub fails", async () => {
  const { sut, github, clock } = makeSUT();
  sut.open("/a/repo", github);
  await github.answer([LOGIN]);
  clock.now += 30_000;
  sut.open("/a/repo", github);

  await github.fail();

  expect(sut.open("/a/repo", github)).toEqual([LOGIN]);
});

function makeSUT() {
  const clock = { now: 0 };
  const github = new PullRequestsSpy();
  const sut = new PullRequestCache(() => clock.now);
  return { sut, github, clock };
}
