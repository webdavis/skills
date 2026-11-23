import { expect, test } from "bun:test";
import { AgentWorktree } from "../../src/agent-worktree.js";
import { BunShell } from "../../src/bun-shell.js";
import { ScratchRepo } from "../helpers/scratch-repo.js";

test("start shows nothing while the agent is in the session's own worktree", async () => {
  const { sut, shell } = makeSUT();

  await sut.start(shell);

  expect(sut.shown).toBeUndefined();
});

test("acted shows another worktree of the repository by its folder name and branch", async () => {
  const { sut, repo, shell } = makeSUT();
  await sut.start(shell);

  expect(await sut.acted(`${repo.path}-feature-b/src`, shell)).toBe(true);
  expect(sut.shown).toEqual({ name: `${repo.name}-feature-b`, branch: "feature-b" });
});

test("acted shows a worktree of another repository with that repository's name", async () => {
  const { sut, shell } = makeSUT();
  const other = new ScratchRepo().worktree("feature-x");
  await sut.start(shell);

  await sut.acted(`${other.path}-feature-x`, shell);

  expect(sut.shown).toEqual({ repository: other.name, name: `${other.name}-feature-x`, branch: "feature-x" });
});

test("acted shows a worktree with no branch checked out by its commit", async () => {
  const { sut, repo, shell } = makeSUT();
  repo.detachedWorktree();
  await sut.start(shell);

  await sut.acted(`${repo.path}-detached`, shell);

  expect(sut.shown?.name).toBe(`${repo.name}-detached`);
  expect(sut.shown?.commit).toMatch(/^[0-9a-f]{7,}$/);
});

test("acted reports no change while the agent stays in the worktree already shown", async () => {
  const { sut, repo, shell } = makeSUT();
  await sut.start(shell);
  await sut.acted(`${repo.path}-feature-b`, shell);

  expect(await sut.acted(`${repo.path}-feature-b/src`, shell)).toBe(false);
});

test("acted reports no change for a folder outside git", async () => {
  const { sut, shell } = makeSUT();
  await sut.start(shell);

  expect(await sut.acted("/", shell)).toBe(false);
});

test("acted hides the worktree again once the agent is back in the session's own worktree", async () => {
  const { sut, repo, shell } = makeSUT();
  await sut.start(shell);
  await sut.acted(`${repo.path}-feature-b`, shell);

  expect(await sut.acted(repo.path, shell)).toBe(true);
  expect(sut.shown).toBeUndefined();
});

test("acted hides the worktree shown once it is removed", async () => {
  const { sut, repo, shell } = makeSUT();
  await sut.start(shell);
  await sut.acted(`${repo.path}-feature-b`, shell);
  repo.removeWorktree("feature-b");

  expect(await sut.acted(undefined, shell)).toBe(true);
  expect(sut.shown).toBeUndefined();
  expect(sut.lastBranch).toBeUndefined();
});

test("lastBranch answers the branch of the worktree the agent last acted in", async () => {
  const { sut, repo, shell } = makeSUT();
  await sut.start(shell);
  await sut.acted(`${repo.path}-feature-b`, shell);

  expect(sut.lastBranch).toBe("feature-b");
});

function makeSUT() {
  const repo = new ScratchRepo().worktree("feature-b");
  Bun.spawnSync(["mkdir", "-p", `${repo.path}-feature-b/src`]);
  const shell = new BunShell(repo.path);
  const sut = new AgentWorktree(repo.path);
  return { sut, repo, shell };
}
