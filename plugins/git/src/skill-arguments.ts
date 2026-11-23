export type Values = "names" | "branches";

export interface NextArgument {
  words: string[];
  values?: Values;
}

const NOTHING: NextArgument = { words: [] };

function unused(flags: string[], earlier: string[]): string[] {
  return flags.filter((flag) => !earlier.includes(flag));
}

function worktreeDelete(earlier: string[]): NextArgument {
  if (earlier.length === 1) return { words: [], values: "names" };
  return { words: unused(["--branch", "--remote"], earlier) };
}

function worktreeCatchup(earlier: string[]): NextArgument {
  if (earlier.at(-1) === "--with") return { words: [], values: "branches" };
  if (earlier.includes("--with")) return NOTHING;
  return earlier.length === 1 ? { words: ["--with"], values: "names" } : { words: ["--with"] };
}

function worktree(earlier: string[]): NextArgument {
  if (earlier.length === 0) return { words: ["list", "delete", "catchup"], values: "names" };
  if (earlier[0] === "delete") return worktreeDelete(earlier);
  if (earlier[0] === "catchup") return worktreeCatchup(earlier);
  return NOTHING;
}

const MERGE_METHODS = ["--merge", "--squash", "--rebase"];

function merge(earlier: string[]): NextArgument {
  if (earlier.at(-1) === "--policy") return { words: ["merge", "squash", "rebase"] };
  const methodGiven = earlier.some((word) => MERGE_METHODS.includes(word));
  const flags = unused(["--keep", ...(methodGiven ? [] : MERGE_METHODS), "--policy"], earlier);
  return earlier.length === 0 ? { words: flags, values: "branches" } : { words: flags };
}

const SKILLS: Record<string, (earlier: string[]) => NextArgument> = {
  clean: (earlier) => (earlier.length === 0 ? { words: [], values: "names" } : NOTHING),
  worktree,
  merge,
};

export function nextArgument(skill: string, earlier: string[]): NextArgument | undefined {
  return SKILLS[skill]?.(earlier);
}
