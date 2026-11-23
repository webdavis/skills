import type { AutocompleteItem, AutocompleteProvider } from "@oh-my-pi/pi-tui";
import type { ArgumentCompleter } from "./argument-completer.js";

type Suggestions = { items: AutocompleteItem[]; prefix: string };

export class OmpAutocomplete {
  constructor(private readonly completer: ArgumentCompleter) {}

  private async suggest(lines: string[], cursorLine: number, cursorCol: number): Promise<Suggestions | undefined> {
    if (cursorLine !== 0) return undefined;
    const completion = await this.completer.complete(lines[0]!.slice(0, cursorCol));
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
