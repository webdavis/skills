import { expect, test } from "bun:test";
import { formatWorktree } from "../../src/worktree-label.js";

const MARKED = { dim: (text: string) => `dim(${text})`, accent: (text: string) => `accent(${text})` };
const PLAIN = { dim: (text: string) => text, accent: (text: string) => text };

test("formatWorktree shows a dim worktree label before the worktree's name in the accent colour", () => {
  expect(formatWorktree({ name: "feat-shout", branch: "feat/shout" }, MARKED)).toBe("dim(worktree) accent(feat-shout)");
});

test("formatWorktree puts the repository's name before a worktree of another repository", () => {
  expect(formatWorktree({ repository: "dotfiles", name: "feat-install", branch: "feat/install" }, PLAIN)).toBe(
    "worktree dotfiles › feat-install",
  );
  expect(formatWorktree({ repository: "dotfiles", name: "x", branch: "x" }, MARKED)).toBe(
    "dim(worktree) dim(dotfiles ›) accent(x)",
  );
});

test("formatWorktree shows the branch only when Worktrunk would not have named the folder after it", () => {
  expect(formatWorktree({ name: "odd-folder", branch: "feat/install" }, MARKED)).toBe(
    "dim(worktree) accent(odd-folder) dim((feat/install))",
  );
});

test("formatWorktree shows the commit of a worktree with no branch checked out", () => {
  expect(formatWorktree({ name: "spike", commit: "1a2b3c4" }, MARKED)).toBe(
    "dim(worktree) accent(spike) dim(@1a2b3c4)",
  );
});
