import { expect, test } from "bun:test";
import { GitNames } from "../../src/git-names.ts";
import { ShellGit } from "../../src/shell-git.ts";
import { notARepository, ScratchRepo } from "../helpers/scratch-repo.ts";

test("branches answers every local branch", async () => {
  const repo = new ScratchRepo().branch("feature-a").branch("fix/typo");

  expect(await makeSUT(repo.path).branches()).toEqual(["feature-a", "fix/typo", "main"]);
});

test("branches answers nothing outside a git repository", async () => {
  expect(await makeSUT(notARepository()).branches()).toEqual([]);
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
  return new GitNames(new ShellGit(cwd));
}
