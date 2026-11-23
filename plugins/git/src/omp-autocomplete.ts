import type { AutocompleteItem, AutocompleteProvider } from "@oh-my-pi/pi-tui";
import { skillChipLabel } from "@oh-my-pi/pi-tui/prompt/composer-attachments";
import type { ArgumentCompleter } from "./argument-completer.js";
import { SKILL_NAMES } from "./skill-arguments.js";

type Suggestions = { items: AutocompleteItem[]; prefix: string };

// omp turns a picked /skill:<name> into a chip whose label stands in the prompt until it is sent.
function withSkillChipTyped(text: string): string {
  const skill = SKILL_NAMES.find((name) => text.startsWith(`${skillChipLabel(name)} `));
  return skill ? `/skill:${skill}${text.slice(skillChipLabel(skill).length)}` : text;
}

export class OmpAutocomplete {
  constructor(private readonly completer: ArgumentCompleter) {}

  private async suggest(lines: string[], cursorLine: number, cursorCol: number): Promise<Suggestions | undefined> {
    if (cursorLine !== 0) return undefined;
    const completion = await this.completer.complete(withSkillChipTyped(lines[0]!.slice(0, cursorCol)));
    if (!completion?.suggestions.length) return undefined;
    const items = completion.suggestions.map(({ value, description }) => ({ value, label: value, description }));
    return { items, prefix: completion.word };
  }

  wrap(ompsOwn: AutocompleteProvider): AutocompleteProvider {
    const getSuggestions: AutocompleteProvider["getSuggestions"] = async (lines, cursorLine, cursorCol, ...rest) =>
      (await this.suggest(lines, cursorLine, cursorCol)) ??
      ompsOwn.getSuggestions(lines, cursorLine, cursorCol, ...rest);
    const getForceFileSuggestions: AutocompleteProvider["getForceFileSuggestions"] = async (
      lines,
      cursorLine,
      cursorCol,
      ...rest
    ) =>
      (await this.suggest(lines, cursorLine, cursorCol)) ??
      ompsOwn.getForceFileSuggestions?.(lines, cursorLine, cursorCol, ...rest) ??
      null;
    const replaced: Partial<AutocompleteProvider> = { getSuggestions, getForceFileSuggestions };
    // omp's provider keeps private fields, so each of its methods it keeps must still run on it.
    return new Proxy(ompsOwn, {
      get: (target, key) => {
        if (key in replaced) return replaced[key as keyof AutocompleteProvider];
        const value = Reflect.get(target, key);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  }
}
