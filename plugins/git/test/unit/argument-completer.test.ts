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
const MERGE_FLAGS = ["--keep", "--merge", "--squash", "--rebase", "--policy"].map((value) => ({ value }));

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
  expect(await suggestionsFor("/merge --squash --")).toEqual([{ value: "--keep" }, { value: "--policy" }]);
});

test("complete suggests the merge methods after /merge --policy", async () => {
  expect(await suggestionsFor("/merge --policy ")).toEqual([
    { value: "merge" },
    { value: "squash" },
    { value: "rebase" },
  ]);
});

test("complete suggests close after /pr, then the open pull requests", async () => {
  expect(await suggestionsFor("/pr ")).toEqual([{ value: "close" }]);
  expect(await suggestionsFor("/pr close ")).toEqual(PULL_REQUESTS);
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

test("complete leaves alone a prompt that does not start with one of the skills", async () => {
  expect(await suggestionsFor("/amend ")).toBeUndefined();
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

async function suggestionsFor(textBeforeCursor: string) {
  return (await makeSUT().complete(textBeforeCursor))?.suggestions;
}

function makeSUT(commandPrefixes = [""]) {
  return new ArgumentCompleter(new RepositoryStub(), new PullRequestsStub(), commandPrefixes);
}
