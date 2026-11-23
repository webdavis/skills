import { expect, test } from "bun:test";
import gitExtension from "../../src/git-completion.js";
import { OmpContextSpy } from "../helpers/omp-context-spy.js";
import { OmpSpy } from "../helpers/omp-spy.js";
import { ScratchRepo } from "../helpers/scratch-repo.js";

test("an omp session starts with no worktree on the status line while the agent works in the session's own", async () => {
  const { context } = await makeSUT();

  expect(context.statusLine).toEqual([undefined]);
});

test("the status line names the worktree the agent edits a file in", async () => {
  const { omp, context, repo } = await makeSUT();

  await omp.agentCalls("edit", { input: `[${repo.path}-feature-b/notes.md#1A2B]\nPUT 1:\n+x` }, context);

  expect(context.statusLine).toEqual([`dim(worktree) accent(${repo.name}-feature-b) dim((feature-b))`]);
});

test("the status line drops the worktree once the agent reads in the session's own again", async () => {
  const { omp, context, repo } = await makeSUT();

  await omp.agentCalls("bash", { command: "git status", cwd: `${repo.path}-feature-b` }, context);
  await omp.agentCalls("read", { path: `${repo.path}/README.md` }, context);

  expect(context.statusLine).toEqual([undefined]);
});

test("the worktree the agent last worked in comes first in omp's worktree picker", async () => {
  const { omp, context, repo } = await makeSUT();
  await omp.agentCalls("bash", { command: `cd ${repo.path}-feature-b && git status` }, context);

  const suggestions = await context.autocomplete.getSuggestions(["/skill:worktree delete "], 0, 23);

  expect(suggestions?.items.map((item) => `${item.label} · ${item.description}`)).toEqual([
    "feature-b · agent",
    "main · worktree",
  ]);
});

async function makeSUT() {
  const repo = new ScratchRepo().worktree("feature-b");
  const omp = new OmpSpy();
  const context = new OmpContextSpy(repo.path);
  gitExtension(omp);
  await omp.startSession(context);
  return { omp, context, repo };
}
