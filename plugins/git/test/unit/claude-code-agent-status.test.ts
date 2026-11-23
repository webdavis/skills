import { expect, test } from "bun:test";
import { register } from "../../hooks/git-completion.js";
import { ClaudeCodeSpy } from "../helpers/claude-code-spy.js";
import { ScratchRepo } from "../helpers/scratch-repo.js";

test("a Claude Code session starts with no worktree under the prompt while the agent works in the session's own", async () => {
  const { claudeCode } = await makeSUT();

  expect(claudeCode.statusLines).toEqual([undefined]);
});

test("the line under Claude Code's prompt names the worktree the agent edits a file in", async () => {
  const { claudeCode, repo } = await makeSUT();

  await claudeCode.agentCalls("Edit", {
    file_path: `${repo.path}-feature-b/notes.md`,
    old_string: "a",
    new_string: "b",
  });

  expect(claudeCode.statusLines.at(-1)).toBe(`worktree ${repo.name}-feature-b (feature-b)`);
});

test("the line under Claude Code's prompt follows a shell command that moves into a worktree", async () => {
  const { claudeCode, repo } = await makeSUT();

  await claudeCode.agentCalls("Bash", { command: `cd ${repo.path}-feature-b && git status` });

  expect(claudeCode.statusLines.at(-1)).toBe(`worktree ${repo.name}-feature-b (feature-b)`);
});

test("the agent's tool call still runs in Claude Code", async () => {
  const { claudeCode, repo } = await makeSUT();

  expect(await claudeCode.agentCalls("Read", { file_path: `${repo.path}/README.md` })).toEqual({ result: "ran" });
});

test("the worktree the agent last worked in comes first in Claude Code's worktree picker", async () => {
  const { claudeCode, repo } = await makeSUT();
  await claudeCode.agentCalls("Write", { file_path: `${repo.path}-feature-b/new.md`, content: "x" });

  expect(await claudeCode.typeInPrompt("/git:worktree delete f")).toEqual(["feature-b · agent"]);
});

async function makeSUT() {
  const repo = new ScratchRepo().worktree("feature-b");
  const claudeCode = new ClaudeCodeSpy(repo.path);
  register(claudeCode.on);
  await claudeCode.startSession();
  return { claudeCode, repo };
}
