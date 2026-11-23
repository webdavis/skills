import { expect, test } from "bun:test";
import { ArgumentCompleter } from "../../src/argument-completer.ts";
import { NamesStub } from "../helpers/names-stub.ts";

const WORKTREE_MAIN = { value: "main", description: "worktree" };
const WORKTREE_FEATURE_B = { value: "feature-b", description: "worktree" };
const BRANCH_FEATURE_A = { value: "feature-a", description: "branch" };

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

function makeSUT() {
  return new ArgumentCompleter(new NamesStub());
}
