import type { Git } from "./git.ts";
import type { Names } from "./names.ts";

function lines(output: string): string[] {
  return output.split("\n").filter((line) => line !== "");
}

export class GitNames implements Names {
  constructor(private readonly git: Git) {}

  async branches(): Promise<string[]> {
    return lines(await this.git.run(["for-each-ref", "--format=%(refname:short)", "refs/heads"]));
  }
}
