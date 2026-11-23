import { expect, test } from "bun:test";
import { AgentWorktree } from "../../src/agent-worktree.js";
import { BunShell } from "../../src/bun-shell.js";
import { ScratchRepo } from "../helpers/scratch-repo.js";

test("start shows the session folder as this folder with its branch", async () => {
  const { sut, shell } = makeSUT();

  expect(await sut.start(shell)).toBe("agent: this folder · branch main");
});

test("acted shows another worktree of the repository by its folder name and branch", async () => {
  const { sut, repo, shell } = makeSUT();
  await sut.start(shell);

  expect(await sut.acted(`${repo.path}-feature-b/src`, shell)).toBe(
    `agent worktree: ${repo.name}-feature-b · branch feature-b`,
  );
});

test("acted shows a worktree of another repository behind that repository's name", async () => {
  const { sut, shell } = makeSUT();
  const other = new ScratchRepo().worktree("feature-x");
  await sut.start(shell);

  expect(await sut.acted(`${other.path}-feature-x`, shell)).toBe(
    `agent worktree: ${other.name}/${other.name}-feature-x · branch feature-x`,
  );
});

test("acted shows a worktree with no branch checked out by its commit", async () => {
  const { sut, repo, shell } = makeSUT();
  repo.detachedWorktree();
  await sut.start(shell);

  expect(await sut.acted(`${repo.path}-detached`, shell)).toMatch(
    new RegExp(`^agent worktree: ${repo.name}-detached · branch detached at [0-9a-f]{7,}$`),
  );
});

test("acted shows nothing new while the agent stays in the worktree already shown", async () => {
  const { sut, repo, shell } = makeSUT();
  await sut.start(shell);
  await sut.acted(`${repo.path}-feature-b`, shell);

  expect(await sut.acted(`${repo.path}-feature-b/src`, shell)).toBeUndefined();
});

test("acted shows nothing new for a folder outside git", async () => {
  const { sut, shell } = makeSUT();
  await sut.start(shell);

  expect(await sut.acted("/", shell)).toBeUndefined();
});

test("acted goes back to the session folder once the worktree shown is removed", async () => {
  const { sut, repo, shell } = makeSUT();
  await sut.start(shell);
  await sut.acted(`${repo.path}-feature-b`, shell);
  repo.removeWorktree("feature-b");

  expect(await sut.acted(undefined, shell)).toBe("agent: this folder · branch main");
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
