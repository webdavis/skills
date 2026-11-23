import { expect, test } from "bun:test";
import { ArgumentCompleter } from "../../src/argument-completer.ts";
import { NamesStub } from "../helpers/names-stub.ts";

const WORKTREE_MAIN = { value: "main", description: "worktree" };
const WORKTREE_FEATURE_B = { value: "feature-b", description: "worktree" };
const BRANCH_FEATURE_A = { value: "feature-a", description: "branch" };
const NAMES = [WORKTREE_MAIN, WORKTREE_FEATURE_B, BRANCH_FEATURE_A];
const BRANCHES = [
  { value: "feature-a", description: "branch" },
  { value: "feature-b", description: "branch" },
  { value: "main", description: "branch" },
];

test("complete suggests the worktrees, then the other branches, after /clean", async () => {
  expect(await makeSUT().complete("/clean ")).toEqual({
    word: "",
    suggestions: [WORKTREE_MAIN, WORKTREE_FEATURE_B, BRANCH_FEATURE_A],
  });
});

test("complete suggests only the names that start with the word being typed", async () => {
  expect(await makeSUT().complete("/clean fe")).toEqual({
    word: "fe",
    suggestions: [WORKTREE_FEATURE_B, BRANCH_FEATURE_A],
  });
});

test("complete suggests nothing after /clean's one name", async () => {
  expect(await makeSUT().complete("/clean main ")).toEqual({ word: "", suggestions: [] });
});

test("complete leaves alone a prompt that does not start with one of the skills", async () => {
  const sut = makeSUT();

  expect([await sut.complete("/commit "), await sut.complete("tidy up /clean ")]).toEqual([undefined, undefined]);
});

test("complete suggests /worktree's keywords, then the names", async () => {
  expect(await suggestionsFor("/worktree ")).toEqual([
    { value: "list" },
    { value: "delete" },
    { value: "catchup" },
    ...NAMES,
  ]);
});

test("complete suggests the names after /worktree delete", async () => {
  expect(await suggestionsFor("/worktree delete ")).toEqual(NAMES);
});

test("complete suggests the flags /worktree delete has not been given yet", async () => {
  expect(await suggestionsFor("/worktree delete main --branch ")).toEqual([{ value: "--remote" }]);
});

test("complete suggests --with and the names after /worktree catchup", async () => {
  expect(await suggestionsFor("/worktree catchup ")).toEqual([{ value: "--with" }, ...NAMES]);
});

test("complete suggests only --with after the name /worktree catchup is given", async () => {
  expect(await suggestionsFor("/worktree catchup feature-b ")).toEqual([{ value: "--with" }]);
});

test("complete suggests every branch after /worktree catchup's --with", async () => {
  expect(await suggestionsFor("/worktree catchup feature-b --with ")).toEqual(BRANCHES);
});

test("complete suggests nothing after /worktree list", async () => {
  expect(await suggestionsFor("/worktree list ")).toEqual([]);
});

async function suggestionsFor(textBeforeCursor: string) {
  return (await makeSUT().complete(textBeforeCursor))?.suggestions;
}

function makeSUT() {
  return new ArgumentCompleter(new NamesStub());
}
