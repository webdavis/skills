import type { Repository } from "./repository.js";
import { nextArgument, type Values } from "./skill-arguments.js";

export interface Suggestion {
  value: string;
  description?: string;
}

export interface Completion {
  word: string;
  suggestions: Suggestion[];
}

function described(description: string) {
  return (value: string): Suggestion => ({ value, description });
}

export class ArgumentCompleter {
  private readonly skillPrompt: RegExp;

  constructor(
    private readonly repository: Repository,
    commandPrefixes: string[],
  ) {
    const longestFirst = [...commandPrefixes].sort((a, b) => b.length - a.length);
    this.skillPrompt = new RegExp(`^\\s*/(?:${longestFirst.join("|")})(\\S+)\\s+(.*)$`, "s");
  }

  async complete(textBeforeCursor: string): Promise<Completion | undefined> {
    const prompt = this.skillPrompt.exec(textBeforeCursor);
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
    if (values === "branches") return (await this.repository.localBranches()).map(described("branch"));
    if (values !== "names") return [];
    const worktrees = await this.repository.worktrees();
    const otherBranches = (await this.repository.localBranches()).filter((branch) => !worktrees.includes(branch));
    return [...worktrees.map(described("worktree")), ...otherBranches.map(described("branch"))];
  }
}
