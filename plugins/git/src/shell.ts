export interface Shell {
  run(argv: string[]): Promise<string>;
}
