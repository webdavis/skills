export interface Git {
  run(args: string[]): Promise<string>;
}
