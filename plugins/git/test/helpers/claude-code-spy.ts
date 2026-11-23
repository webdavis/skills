type Row = { text: string; label?: string; description?: string };
type Rows = { suggestions: Row[] };
type AutocompleteEvent = { text: string; cursor: number; token: string; start: number };
type Hook = (mods: object, event: any, next: (event: any) => Promise<any>) => Promise<any>;

export class ClaudeCodeSpy {
  private readonly hooks = new Map<string, Hook>();
  private ownRows: Row[] = [];
  private gitStarts = true;
  private github: object[] = [];
  readonly statusLines: (string | undefined)[] = [];

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

  githubHasOpen(...pullRequests: { number: number; title: string; headRefName: string }[]): void {
    this.github = pullRequests;
  }

  async startSession(): Promise<void> {
    await this.hooks.get("session.start")!(this.mods, { cwd: this.cwd, surface: "terminal" }, async () => ({}));
  }

  async agentCalls(tool: string, args: object): Promise<unknown> {
    const event = { tool, tool_use_id: "toolu_1", ...args };
    return this.hooks.get("tool.call")!(this.mods, event, async () => ({ result: "ran" }));
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
    ui: {
      status: (text: string | undefined) => {
        this.statusLines.push(text);
      },
    },
    env: {
      get: async (name: string) => (name === "HOME" ? "/Users/someone" : undefined),
    },
    process: {
      run: async (argv: string[]) => {
        if (!this.gitStarts) throw new Error(`${argv[0]} could not start`);
        if (argv[0] === "gh") return { exitCode: 0, stdout: JSON.stringify(this.github), stderr: "" };
        const result = Bun.spawnSync(argv, { cwd: this.cwd });
        return { exitCode: result.exitCode, stdout: result.stdout.toString(), stderr: result.stderr.toString() };
      },
    },
  };
}
