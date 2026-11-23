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

function makeSUT(cwd: string) {
  return new GitNames(new ShellGit(cwd));
}
