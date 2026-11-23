import { expect, test } from "bun:test";
import { ArgumentCompleter } from "../../src/argument-completer.js";
import { PullRequestsStub } from "../helpers/pull-requests-stub.js";
import { RepositoryStub } from "../helpers/repository-stub.js";

const WORKTREES = [
  { value: "main", description: "worktree" },
  { value: "feature-b", description: "worktree" },
];
const BRANCHES = [
  { value: "feature-a", description: "branch" },
  { value: "feature-b", description: "branch" },
  { value: "main", description: "branch" },
  { value: "feature-g", description: "GitHub branch" },
];
const PULL_REQUESTS = [
  { value: "12", label: "#12 Add the login page", description: "feature-login" },
  { value: "9", label: "#9 Fix a typo", description: "fix-typo" },
];
const FOLDERS = [
  { value: "docs", description: "folder" },
  { value: "src", description: "folder" },
  { value: "src/app", description: "folder" },
];
const MERGE_FLAGS = ["--keep", "--auto", "--merge", "--squash", "--rebase", "--policy"].map((value) => ({ value }));

test("complete suggests /worktree's keywords, then the local and GitHub branches to make a worktree for", async () => {
  expect(await suggestionsFor("/worktree ")).toEqual([
    { value: "list" },
    { value: "delete" },
    { value: "catchup" },
    ...BRANCHES,
  ]);
});

test("complete suggests the worktrees after /worktree delete", async () => {
  expect(await suggestionsFor("/worktree delete ")).toEqual(WORKTREES);
});

test("complete suggests the flags /worktree delete has not been given yet", async () => {
  expect(await suggestionsFor("/worktree delete main --branch ")).toEqual([{ value: "--remote" }]);
});

test("complete suggests --with and the worktrees after /worktree catchup", async () => {
  expect(await suggestionsFor("/worktree catchup ")).toEqual([{ value: "--with" }, ...WORKTREES]);
});

test("complete suggests only --with after the worktree /worktree catchup is given", async () => {
  expect(await suggestionsFor("/worktree catchup feature-b ")).toEqual([{ value: "--with" }]);
});

test("complete suggests every branch after /worktree catchup's --with", async () => {
  expect(await suggestionsFor("/worktree catchup feature-b --with ")).toEqual(BRANCHES);
});

test("complete suggests nothing after /worktree list", async () => {
  expect(await suggestionsFor("/worktree list ")).toEqual([]);
});

test("complete suggests the worktrees, then the other local and GitHub branches, after /clean", async () => {
  expect(await suggestionsFor("/clean ")).toEqual([
    ...WORKTREES,
    { value: "feature-a", description: "branch" },
    { value: "feature-g", description: "GitHub branch" },
  ]);
});

test("complete suggests nothing after /clean's one name", async () => {
  expect(await suggestionsFor("/clean main ")).toEqual([]);
});

test("complete suggests /merge's flags, then the open pull requests", async () => {
  expect(await suggestionsFor("/merge ")).toEqual([...MERGE_FLAGS, ...PULL_REQUESTS]);
});

test("complete suggests only /merge's flags after the pull request", async () => {
  expect(await suggestionsFor("/merge 12 ")).toEqual(MERGE_FLAGS);
});

test("complete suggests no second merge method after /merge is given one", async () => {
  expect(await suggestionsFor("/merge --squash --")).toEqual([
    { value: "--keep" },
    { value: "--auto" },
    { value: "--policy" },
  ]);
});

test("complete still suggests a merge method once /merge is given --auto", async () => {
  expect(await suggestionsFor("/merge --auto --")).toEqual([
    { value: "--keep" },
    { value: "--merge" },
    { value: "--squash" },
    { value: "--rebase" },
    { value: "--policy" },
  ]);
});

test("complete suggests the merge methods after /merge --policy", async () => {
  expect(await suggestionsFor("/merge --policy ")).toEqual([
    { value: "merge" },
    { value: "squash" },
    { value: "rebase" },
  ]);
});

test("complete suggests /pr's --draft and keywords in the order the skill gives them", async () => {
  expect(await suggestionsFor("/pr ")).toEqual([
    { value: "--draft" },
    { value: "status" },
    { value: "checkout" },
    { value: "ready" },
    { value: "close" },
    { value: "reopen" },
  ]);
});

test("complete suggests nothing more after /pr --draft", async () => {
  expect(await suggestionsFor("/pr --draft ")).toEqual([]);
});

test("complete suggests the open draft pull requests after /pr ready", async () => {
  expect(await suggestionsFor("/pr ready ")).toEqual([
    { value: "15", label: "#15 Sketch the settings page", description: "settings" },
  ]);
});

test("complete suggests the open pull requests after /pr status, /pr checkout and /pr close", async () => {
  expect(await suggestionsFor("/pr status ")).toEqual(PULL_REQUESTS);
  expect(await suggestionsFor("/pr checkout ")).toEqual(PULL_REQUESTS);
  expect(await suggestionsFor("/pr close ")).toEqual(PULL_REQUESTS);
});

test("complete suggests the closed pull requests that were never merged after /pr reopen", async () => {
  expect(await suggestionsFor("/pr reopen ")).toEqual([
    { value: "7", label: "#7 Try a new theme", description: "theme" },
  ]);
});

test("complete suggests nothing after /pr's pull request", async () => {
  expect(await suggestionsFor("/pr status 12 ")).toEqual([]);
});

test("complete suggests --policy after /commit, then the policies and folders, then the folders", async () => {
  expect(await suggestionsFor("/commit ")).toEqual([{ value: "--policy" }]);
  expect(await suggestionsFor("/commit --policy ")).toEqual([
    { value: "tdd" },
    { value: "guard" },
    { value: "off" },
    ...FOLDERS,
  ]);
  expect(await suggestionsFor("/commit --policy tdd ")).toEqual(FOLDERS);
});

test("complete suggests on and off after /git", async () => {
  expect(await suggestionsFor("/git ")).toEqual([{ value: "on" }, { value: "off" }]);
});

test("complete suggests the values that hold the typed text, those that start with it first", async () => {
  expect(await suggestionsFor("/clean b")).toEqual([{ value: "feature-b", description: "worktree" }]);
  expect(await suggestionsFor("/worktree delete MA")).toEqual([{ value: "main", description: "worktree" }]);
});

test("complete finds a pull request by its number, its title or its branch", async () => {
  expect(await suggestionsFor("/pr close 9")).toEqual([PULL_REQUESTS[1]]);
  expect(await suggestionsFor("/pr close login")).toEqual([PULL_REQUESTS[0]]);
  expect(await suggestionsFor("/pr close typo")).toEqual([PULL_REQUESTS[1]]);
});

test("complete suggests the branch's own commits after /amend, newest first", async () => {
  expect(await suggestionsFor("/amend ")).toEqual([
    { value: "1a2b3c4", label: "Fix the label", description: "1a2b3c4" },
    { value: "5d6e7f8", label: "Add the form", description: "5d6e7f8" },
  ]);
  expect(await suggestionsFor("/amend form")).toEqual([
    { value: "5d6e7f8", label: "Add the form", description: "5d6e7f8" },
  ]);
});

test("complete suggests nothing for the free text after /amend's commit", async () => {
  expect(await suggestionsFor("/amend 1a2b3c4 ")).toEqual([]);
});

test("complete leaves alone a prompt that does not start with one of the skills", async () => {
  expect(await suggestionsFor("/conventional-commits ")).toBeUndefined();
  expect(await suggestionsFor("tidy up /clean ")).toBeUndefined();
});

test("complete answers the word being typed", async () => {
  expect((await makeSUT().complete("/worktree delete fe"))?.word).toBe("fe");
});

test("complete suggests the same arguments under every command form the host names the skill with", async () => {
  const sut = makeSUT(["", "git:"]);

  expect(await sut.complete("/git:worktree delete ")).toEqual((await sut.complete("/worktree delete "))!);
});

test("complete leaves alone a command form the host keeps for something else", async () => {
  const sut = makeSUT(["skill:"]);

  expect(await sut.complete("/worktree delete ")).toBeUndefined();
  expect(await sut.complete("/skill:worktree delete ")).toBeDefined();
});

test("complete lists the worktree the agent last worked in first, tagged agent", async () => {
  const sut = new ArgumentCompleter(new RepositoryStub(), new PullRequestsStub(), [""], () => "feature-b");
  const agentFirst = [
    { value: "feature-b", description: "agent" },
    { value: "main", description: "worktree" },
  ];

  expect((await sut.complete("/worktree delete "))?.suggestions).toEqual(agentFirst);
  expect((await sut.complete("/worktree catchup "))?.suggestions).toEqual([{ value: "--with" }, ...agentFirst]);
  expect((await sut.complete("/clean "))?.suggestions.slice(0, 2)).toEqual(agentFirst);
});

async function suggestionsFor(textBeforeCursor: string) {
  return (await makeSUT().complete(textBeforeCursor))?.suggestions;
}

function makeSUT(commandPrefixes = [""]) {
  return new ArgumentCompleter(new RepositoryStub(), new PullRequestsStub(), commandPrefixes);
}
