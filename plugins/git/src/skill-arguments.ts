export type Values = "names";

export interface NextArgument {
  words: string[];
  values?: Values;
}

const NOTHING: NextArgument = { words: [] };

const SKILLS: Record<string, (earlier: string[]) => NextArgument> = {
  clean: (earlier) => (earlier.length === 0 ? { words: [], values: "names" } : NOTHING),
};

export function nextArgument(skill: string, earlier: string[]): NextArgument | undefined {
  return SKILLS[skill]?.(earlier);
}
