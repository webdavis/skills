import { expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
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

test("remoteBranches answers every branch GitHub had at the last fetch", async () => {
  const repo = new ScratchRepo().onGitHub("main", "feature-x");

  expect(await makeSUT(repo.path).remoteBranches()).toEqual(["feature-x", "main"]);
});

test("remoteBranches answers nothing for a repository with no GitHub remote", async () => {
  expect(await makeSUT(new ScratchRepo().path).remoteBranches()).toEqual([]);
});

test("folders answers every folder holding a tracked or new file, leaving out what git ignores", async () => {
  const repo = new ScratchRepo().file("src/app/main.ts").file("docs/readme.md").file("build/out.js");
  writeFileSync(`${repo.path}/.gitignore`, "build/\n");

  expect(await makeSUT(repo.path).folders()).toEqual(["docs", "src", "src/app"]);
});

test("root answers the top folder of the repository from any folder inside it", async () => {
  const repo = new ScratchRepo().file("src/app/main.ts");

  expect(await makeSUT(`${repo.path}/src/app`).root()).toBe(repo.path);
});

test("branchCommits answers the branch's own commits since origin/main, newest first", async () => {
  const repo = new ScratchRepo().onGitHub("main").onNewBranch("feature").commit("Add the form").commit("Fix the label");

  const commits = await makeSUT(repo.path).branchCommits();

  expect(commits.map(({ subject }) => subject)).toEqual(["Fix the label", "Add the form"]);
  expect(commits[0]?.sha).toMatch(/^[0-9a-f]{7,}$/);
});

test("branchCommits counts from the base the branch remembers", async () => {
  const repo = new ScratchRepo().onGitHub("main").onNewBranch("base").commit("On the base");
  repo.onNewBranch("feature").commit("On the feature").config("branch.feature.base", "base");

  expect((await makeSUT(repo.path).branchCommits()).map(({ subject }) => subject)).toEqual(["On the feature"]);
});

test("branchCommits answers nothing on main itself or without a base to count from", async () => {
  expect(await makeSUT(new ScratchRepo().onGitHub("main").path).branchCommits()).toEqual([]);
  expect(await makeSUT(new ScratchRepo().onNewBranch("feature").commit("x").path).branchCommits()).toEqual([]);
});

function makeSUT(cwd: string) {
  return new GitRepository(new BunShell(cwd));
}
