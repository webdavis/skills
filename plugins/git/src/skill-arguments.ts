export type Values =
  | "worktrees"
  | "localBranches"
  | "remoteBranches"
  | "openPullRequests"
  | "closedPullRequests"
  | "draftPullRequests"
  | "branchCommits"
  | "folders";

export interface NextArgument {
  words: string[];
  values: Values[];
}

const NOTHING: NextArgument = { words: [], values: [] };
const BRANCHES: Values[] = ["localBranches", "remoteBranches"];
const MERGE_METHODS = ["--merge", "--squash", "--rebase"];
const PR_ACTIONS: Record<string, Values> = {
  status: "openPullRequests",
  checkout: "openPullRequests",
  ready: "draftPullRequests",
  close: "openPullRequests",
  reopen: "closedPullRequests",
};
const COMMIT_POLICIES = ["tdd", "guard", "off"];

function unused(flags: string[], earlier: string[]): string[] {
  return flags.filter((flag) => !earlier.includes(flag));
}

function worktreeDelete(earlier: string[]): NextArgument {
  if (earlier.length === 1) return { words: [], values: ["worktrees"] };
  return { words: unused(["--branch", "--remote"], earlier), values: [] };
}

function worktreeCatchup(earlier: string[]): NextArgument {
  if (earlier.at(-1) === "--with") return { words: [], values: BRANCHES };
  if (earlier.includes("--with")) return NOTHING;
  return { words: ["--with"], values: earlier.length === 1 ? ["worktrees"] : [] };
}

function worktree(earlier: string[]): NextArgument {
  if (earlier.length === 0) return { words: ["list", "delete", "catchup"], values: BRANCHES };
  if (earlier[0] === "delete") return worktreeDelete(earlier);
  if (earlier[0] === "catchup") return worktreeCatchup(earlier);
  return NOTHING;
}

function merge(earlier: string[]): NextArgument {
  if (earlier.at(-1) === "--policy") return { words: ["merge", "squash", "rebase"], values: [] };
  const methodGiven = earlier.some((word) => MERGE_METHODS.includes(word));
  const flags = unused(["--keep", "--auto", ...(methodGiven ? [] : MERGE_METHODS), "--policy"], earlier);
  return { words: flags, values: earlier.length === 0 ? ["openPullRequests"] : [] };
}

function commit(earlier: string[]): NextArgument {
  if (earlier.length === 0) return { words: ["--policy"], values: [] };
  if (earlier[0] !== "--policy") return NOTHING;
  if (earlier.length === 1) return { words: COMMIT_POLICIES, values: ["folders"] };
  return earlier.length === 2 && COMMIT_POLICIES.includes(earlier[1]!) ? { words: [], values: ["folders"] } : NOTHING;
}

const SKILLS: Record<string, (earlier: string[]) => NextArgument> = {
  worktree,
  clean: (earlier) => (earlier.length === 0 ? { words: [], values: ["worktrees", ...BRANCHES] } : NOTHING),
  merge,
  pr: (earlier) => {
    if (earlier.length === 0) return { words: ["--draft", ...Object.keys(PR_ACTIONS)], values: [] };
    const pullRequests = earlier.length === 1 ? PR_ACTIONS[earlier[0]!] : undefined;
    return pullRequests ? { words: [], values: [pullRequests] } : NOTHING;
  },
  commit,
  amend: (earlier) => (earlier.length === 0 ? { words: [], values: ["branchCommits"] } : NOTHING),
  git: (earlier) => (earlier.length === 0 ? { words: ["on", "off"], values: [] } : NOTHING),
};

export const SKILL_NAMES = Object.keys(SKILLS);

export function nextArgument(skill: string, earlier: string[]): NextArgument | undefined {
  return SKILLS[skill]?.(earlier);
}
