type Row = { text: string; label?: string; description?: string };
type Rows = { suggestions: Row[] };
type AutocompleteEvent = { text: string; cursor: number; token: string; start: number };
type Hook = (
  mods: object,
  event: AutocompleteEvent,
  next: (event: AutocompleteEvent) => Promise<Rows>,
) => Promise<Rows>;

export class ClaudeCodeSpy {
  private readonly hooks = new Map<string, Hook>();
  private ownRows: Row[] = [];
  private gitStarts = true;

  constructor(private readonly cwd: string) {}

  readonly on = (event: string, hook: Hook): void => {
    this.hooks.set(event, hook);
  };

  claudeCodeOffers(...texts: string[]): void {
    this.ownRows = texts.map((text) => ({ text }));
  }

  gitCannotStart(): void {
    this.gitStarts = false;
  }

  async typeInPrompt(text: string): Promise<string[]> {
    const start = text.lastIndexOf(" ") + 1;
    const event = { text, cursor: text.length, token: text.slice(start), start };
    const rows = await this.hooks.get("prompt.autocomplete")!(this.mods, event, async () => ({
      suggestions: this.ownRows,
    }));
    return rows.suggestions.map((row) => [row.label ?? row.text, row.description].filter(Boolean).join(" · "));
  }

  private readonly mods = {
    process: {
      run: async (argv: string[]) => {
        if (!this.gitStarts) throw new Error(`${argv[0]} could not start`);
        const result = Bun.spawnSync(argv, { cwd: this.cwd });
        return { exitCode: result.exitCode, stdout: result.stdout.toString(), stderr: result.stderr.toString() };
      },
    },
  };
}
