import { expect, test } from "bun:test";
import type { AutocompleteItem } from "@oh-my-pi/pi-tui";
import gitCompletionExtension from "../../src/git-completion.js";
import { OmpContextSpy } from "../helpers/omp-context-spy.js";
import { OmpSpy } from "../helpers/omp-spy.js";
import { ScratchRepo } from "../helpers/scratch-repo.js";

test("a space after /skill:worktree in omp shows its keywords, then the repository's worktrees and branches", async () => {
  const { context } = await makeSUT();

  const suggestions = await context.autocomplete.getSuggestions(["/skill:worktree "], 0, 16);

  expect(rows(suggestions?.items)).toEqual([
    "list",
    "delete",
    "catchup",
    "main · worktree",
    "feature-b · worktree",
    "feature-a · branch",
  ]);
});

test("typing after /skill:clean in omp narrows the names to those that start with what was typed", async () => {
  const { context } = await makeSUT();

  const suggestions = await context.autocomplete.getSuggestions(["/skill:clean feature-a"], 0, 22);

  expect(rows(suggestions?.items)).toEqual(["feature-a · branch"]);
});

test("picking a name in omp writes it over the word being typed", async () => {
  const { context } = await makeSUT();
  const lines = ["/skill:worktree delete fe"];
  const suggestions = await context.autocomplete.getSuggestions(lines, 0, 25);

  const picked = context.autocomplete.applyCompletion(lines, 0, 25, suggestions!.items[0]!, suggestions!.prefix);

  expect(picked.lines).toEqual(["/skill:worktree delete feature-b"]);
});

test("tab after a finished argument in omp shows what can come next", async () => {
  const { context } = await makeSUT();

  const suggestions = await context.autocomplete.getForceFileSuggestions?.(
    ["/skill:worktree delete feature-b "],
    0,
    33,
  );

  expect(rows(suggestions?.items)).toEqual(["--branch", "--remote"]);
});

test("omp answers every other prompt, its own /worktree command included, with its own suggestions", async () => {
  const { context } = await makeSUT();

  for (const line of ["/comm", "/worktree delete ", "/skill:worktree list "]) {
    const theirs = await context.ompsOwn.getSuggestions([line], 0, line.length);
    expect(await context.autocomplete.getSuggestions([line], 0, line.length)).toEqual(theirs);
  }
});

test("omp's own quick slash command completion keeps working", async () => {
  const { context } = await makeSUT();

  expect(context.autocomplete.trySyncSlashCompletion?.("/comm")).toEqual(
    context.ompsOwn.trySyncSlashCompletion?.("/comm"),
  );
});

function rows(items: AutocompleteItem[] | undefined): string[] | undefined {
  return items?.map((item) => [item.label, item.description].filter(Boolean).join(" · "));
}

async function makeSUT() {
  const repo = new ScratchRepo().branch("feature-a").worktree("feature-b");
  const omp = new OmpSpy();
  const context = new OmpContextSpy(repo.path);
  gitCompletionExtension(omp);
  await omp.startSession(context);
  return { context };
}
