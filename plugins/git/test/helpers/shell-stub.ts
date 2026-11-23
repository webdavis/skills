import type { Shell } from "../../src/shell.js";

export class ShellStub implements Shell {
  readonly messages: string[][] = [];

  constructor(private readonly output: string) {}

  async run(argv: string[]): Promise<string> {
    this.messages.push(argv);
    return this.output;
  }
}
