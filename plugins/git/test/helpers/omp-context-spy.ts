import { type AutocompleteProvider, CombinedAutocompleteProvider } from "@oh-my-pi/pi-tui";

type ProviderFactory = (current: AutocompleteProvider) => AutocompleteProvider;

export class OmpContextSpy {
  readonly ompsOwn: AutocompleteProvider;
  private provider: AutocompleteProvider;

  readonly ui = {
    addAutocompleteProvider: (factory: ProviderFactory): void => {
      this.provider = factory(this.provider);
    },
  };

  constructor(readonly cwd: string) {
    this.ompsOwn = new CombinedAutocompleteProvider([{ name: "commit" }, { name: "worktree" }], cwd);
    this.provider = this.ompsOwn;
  }

  get autocomplete(): AutocompleteProvider {
    return this.provider;
  }
}
