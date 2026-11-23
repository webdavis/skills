import type { Names } from "./names.js";
import { nextArgument, type Values } from "./skill-arguments.js";

export interface Suggestion {
  value: string;
  description?: string;
}

export interface Completion {
  word: string;
  suggestions: Suggestion[];
}

const SKILL_PROMPT = /^\s*\/(?:git:|skill:)?(\S+)\s+(.*)$/s;

function described(description: string) {
  return (value: string): Suggestion => ({ value, description });
}

export class ArgumentCompleter {
  constructor(private readonly names: Names) {}

  async complete(textBeforeCursor: string): Promise<Completion | undefined> {
    const prompt = SKILL_PROMPT.exec(textBeforeCursor);
    if (!prompt) return undefined;
    const [, skill = "", argumentText = ""] = prompt;
    const earlier = argumentText.split(/\s+/);
    const word = earlier.pop() ?? "";
    const next = nextArgument(skill, earlier);
    if (!next) return undefined;
    const candidates = [...next.words.map((value) => ({ value })), ...(await this.values(next.values))];
    return { word, suggestions: candidates.filter((candidate) => candidate.value.startsWith(word)) };
  }

  private async values(values?: Values): Promise<Suggestion[]> {
    if (values === "branches") return (await this.names.branches()).map(described("branch"));
    if (values !== "names") return [];
    const worktrees = await this.names.worktrees();
    const otherBranches = (await this.names.branches()).filter((branch) => !worktrees.includes(branch));
    return [...worktrees.map(described("worktree")), ...otherBranches.map(described("branch"))];
  }
}
