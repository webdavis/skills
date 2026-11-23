import { expect, test } from "bun:test";
import { register } from "../../hooks/git-completion.js";
import { ClaudeCodeSpy } from "../helpers/claude-code-spy.js";
import { ScratchRepo } from "../helpers/scratch-repo.js";

test("typing after /git:clean in Claude Code shows the worktrees and branches that start with it", async () => {
  const { claudeCode } = makeSUT();

  expect(await claudeCode.typeInPrompt("/git:clean f")).toEqual(["feature-b · worktree", "feature-a · branch"]);
});

test("typing after /git:worktree delete in Claude Code shows its flags", async () => {
  const { claudeCode } = makeSUT();

  expect(await claudeCode.typeInPrompt("/git:worktree delete main --")).toEqual(["--branch", "--remote"]);
});

test("Claude Code's own rows come before the skill's rows", async () => {
  const { claudeCode } = makeSUT();
  claudeCode.claudeCodeOffers("first-row");

  expect(await claudeCode.typeInPrompt("/git:merge --k")).toEqual(["first-row", "--keep"]);
});

test("Claude Code's own rows are all that show for any other prompt", async () => {
  const { claudeCode } = makeSUT();
  claudeCode.claudeCodeOffers("feature-a.md");

  expect(await claudeCode.typeInPrompt("look at f")).toEqual(["feature-a.md"]);
});

test("the skill's keywords still show in Claude Code when git cannot start", async () => {
  const { claudeCode } = makeSUT();
  claudeCode.gitCannotStart();

  expect(await claudeCode.typeInPrompt("/git:worktree c")).toEqual(["catchup"]);
});

function makeSUT() {
  const repo = new ScratchRepo().branch("feature-a").worktree("feature-b");
  const claudeCode = new ClaudeCodeSpy(repo.path);
  register(claudeCode.on);
  return { claudeCode };
}
