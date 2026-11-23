export interface WorktreeLabel {
  repository?: string;
  name: string;
  branch?: string;
  commit?: string;
}

export interface Style {
  dim(text: string): string;
  accent(text: string): string;
}

// Worktrunk names a worktree's folder after its branch with each / turned into -.
function namedAfter(branch: string, folder: string): boolean {
  return branch.replaceAll("/", "-") === folder;
}

export function formatWorktree({ repository, name, branch, commit }: WorktreeLabel, style: Style): string {
  const parts = [style.dim("worktree")];
  if (repository) parts.push(style.dim(`${repository} ›`));
  parts.push(style.accent(name));
  if (commit) parts.push(style.dim(`@${commit}`));
  else if (branch && !namedAfter(branch, name)) parts.push(style.dim(`(${branch})`));
  return parts.join(" ");
}
