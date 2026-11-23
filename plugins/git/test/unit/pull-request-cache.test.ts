import { expect, test } from "bun:test";
import { PullRequestCache } from "../../src/pull-request-cache.js";
import { PullRequestsSpy } from "../helpers/pull-requests-spy.js";

const LOGIN = { number: 12, title: "Add the login page", branch: "feature-login" };
const TYPO = { number: 9, title: "Fix a typo", branch: "fix-typo" };

test("read answers nothing at once and asks GitHub in the background", () => {
  const { sut, github } = makeSUT();

  expect(sut.read("/a/repo", () => github.open())).toEqual([]);
  expect(github.messages).toEqual(["open"]);
});

test("read answers the pull requests GitHub gave once they arrive", async () => {
  const { sut, github } = makeSUT();
  sut.read("/a/repo", () => github.open());

  await github.answer([LOGIN]);

  expect(sut.read("/a/repo", () => github.open())).toEqual([LOGIN]);
});

test("read asks GitHub only once while an answer is on its way", () => {
  const { sut, github } = makeSUT();

  sut.read("/a/repo", () => github.open());
  sut.read("/a/repo", () => github.open());

  expect(github.messages).toEqual(["open"]);
});

test("read answers from the cache without asking GitHub again for 30 seconds", async () => {
  const { sut, github, clock } = makeSUT();
  sut.read("/a/repo", () => github.open());
  await github.answer([LOGIN]);
  clock.now += 29_999;

  expect(sut.read("/a/repo", () => github.open())).toEqual([LOGIN]);
  expect(github.messages).toEqual(["open"]);
});

test("read answers the cached pull requests and asks GitHub again after 30 seconds", async () => {
  const { sut, github, clock } = makeSUT();
  sut.read("/a/repo", () => github.open());
  await github.answer([LOGIN]);
  clock.now += 30_000;

  expect(sut.read("/a/repo", () => github.open())).toEqual([LOGIN]);
  await github.answer([LOGIN, TYPO]);

  expect(sut.read("/a/repo", () => github.open())).toEqual([LOGIN, TYPO]);
});

test("read keeps the pull requests of each key apart", async () => {
  const { sut, github } = makeSUT();
  sut.read("/a/repo", () => github.open());
  await github.answer([LOGIN]);

  expect(sut.read("/another/repo", () => github.open())).toEqual([]);
});

test("read keeps the cached pull requests when GitHub fails", async () => {
  const { sut, github, clock } = makeSUT();
  sut.read("/a/repo", () => github.open());
  await github.answer([LOGIN]);
  clock.now += 30_000;
  sut.read("/a/repo", () => github.open());

  await github.fail();

  expect(sut.read("/a/repo", () => github.open())).toEqual([LOGIN]);
});

function makeSUT() {
  const clock = { now: 0 };
  const github = new PullRequestsSpy();
  const sut = new PullRequestCache(() => clock.now);
  return { sut, github, clock };
}
