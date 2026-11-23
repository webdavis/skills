import type { PullRequests } from "./pull-requests.js";
import type { Repository } from "./repository.js";
import { nextArgument, type Values } from "./skill-arguments.js";

export interface Suggestion {
  value: string;
  label?: string;
  description?: string;
}

export interface Completion {
  word: string;
  suggestions: Suggestion[];
}

interface Candidate {
  suggestion: Suggestion;
  searchedText: string[];
}

function candidate(value: string, description?: string): Candidate {
  return { suggestion: description ? { value, description } : { value }, searchedText: [value] };
}

function matching(candidates: Candidate[], word: string): Suggestion[] {
  const typed = word.toLowerCase();
  const holds = (text: string) => text.toLowerCase().includes(typed);
  const startsWith = (text: string) => text.toLowerCase().startsWith(typed);
  const found = candidates.filter(({ searchedText }) => searchedText.some(holds));
  const first = found.filter(({ searchedText }) => searchedText.some(startsWith));
  return [...first, ...found.filter((each) => !first.includes(each))].map(({ suggestion }) => suggestion);
}

export class ArgumentCompleter {
  private readonly skillPrompt: RegExp;

  constructor(
    private readonly repository: Repository,
    private readonly pullRequests: PullRequests,
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
    const values = (await Promise.all(next.values.map((values) => this.candidates(values)))).flat();
    const unique = values.filter(
      (each, index) => values.findIndex((other) => other.suggestion.value === each.suggestion.value) === index,
    );
    return { word, suggestions: matching([...next.words.map((value) => candidate(value)), ...unique], word) };
  }

  private async candidates(values: Values): Promise<Candidate[]> {
    switch (values) {
      case "worktrees":
        return (await this.repository.worktrees()).map((name) => candidate(name, "worktree"));
      case "localBranches":
        return (await this.repository.localBranches()).map((name) => candidate(name, "branch"));
      case "remoteBranches":
        return (await this.repository.remoteBranches()).map((name) => candidate(name, "GitHub branch"));
      case "folders":
        return (await this.repository.folders()).map((name) => candidate(name, "folder"));
      case "pullRequests":
        return (await this.pullRequests.open()).map(({ number, title, branch }) => ({
          suggestion: { value: String(number), label: `#${number} ${title}`, description: branch },
          searchedText: [String(number), title, branch],
        }));
    }
  }
}
