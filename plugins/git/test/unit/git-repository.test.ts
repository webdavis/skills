import { expect, test } from "bun:test";
import { BunShell } from "../../src/bun-shell.js";
import { GitRepository } from "../../src/git-repository.js";
import { notARepository, ScratchRepo } from "../helpers/scratch-repo.js";

test("localBranches answers every local branch", async () => {
  const repo = new ScratchRepo().branch("feature-a").branch("fix/typo");

  expect(await makeSUT(repo.path).localBranches()).toEqual(["feature-a", "fix/typo", "main"]);
});

test("localBranches answers nothing outside a git repository", async () => {
  expect(await makeSUT(notARepository()).localBranches()).toEqual([]);
});

test("worktrees answers the branch of every worktree", async () => {
  const repo = new ScratchRepo().branch("feature-a").worktree("feature-b").worktree("feature-c");

  expect(await makeSUT(repo.path).worktrees()).toEqual(["main", "feature-b", "feature-c"]);
});

test("worktrees leaves out a worktree with no branch checked out", async () => {
  const repo = new ScratchRepo().detachedWorktree();

  expect(await makeSUT(repo.path).worktrees()).toEqual(["main"]);
});

test("worktrees answers nothing outside a git repository", async () => {
  expect(await makeSUT(notARepository()).worktrees()).toEqual([]);
});

function makeSUT(cwd: string) {
  return new GitRepository(new BunShell(cwd));
}
