import { expect, test } from "bun:test";
import { folderOf } from "../../src/agent-folder.js";

const SESSION = "/work/repo";
const HOME = "/Users/me";

test("folderOf answers the folder a shell command runs in", () => {
  expect(folderOf({ cwd: "/work/repo-feature" }, SESSION, HOME)).toBe("/work/repo-feature");
});

test("folderOf answers the folder a shell command moves into first", () => {
  expect(folderOf({ command: "cd /work/repo-feature && git status" }, SESSION, HOME)).toBe("/work/repo-feature");
  expect(folderOf({ command: 'cd "/work/repo two" && ls' }, SESSION, HOME)).toBe("/work/repo two");
});

test("folderOf answers the folder of the file a tool reads or changes", () => {
  expect(folderOf({ path: "/work/repo-feature/src/app.ts" }, SESSION, HOME)).toBe("/work/repo-feature/src");
});

test("folderOf drops the line selector a read path carries", () => {
  expect(folderOf({ path: "/work/repo-feature/src/app.ts:10-20" }, SESSION, HOME)).toBe("/work/repo-feature/src");
});

test("folderOf answers the folder of the first file a patch changes", () => {
  expect(folderOf({ patch: "[/work/repo-feature/src/app.ts#1A2B]\nPUT 3:\n+x" }, SESSION, HOME)).toBe(
    "/work/repo-feature/src",
  );
  expect(folderOf({ patch: "*** Begin Patch\n*** Update File: lib/a.ts\n@@" }, SESSION, HOME)).toBe("/work/repo/lib");
});

test("folderOf reads a relative path from the session folder and ~ as the home folder", () => {
  expect(folderOf({ path: "src/app.ts" }, SESSION, HOME)).toBe("/work/repo/src");
  expect(folderOf({ cwd: "~/other" }, SESSION, HOME)).toBe("/Users/me/other");
});

test("folderOf answers nothing for a call that names no folder or only a web address", () => {
  expect(folderOf({ command: "git status" }, SESSION, HOME)).toBeUndefined();
  expect(folderOf({ path: "https://example.com/page" }, SESSION, HOME)).toBeUndefined();
  expect(folderOf({}, SESSION, HOME)).toBeUndefined();
});
