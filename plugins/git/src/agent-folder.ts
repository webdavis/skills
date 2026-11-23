export interface ToolUse {
  cwd?: string;
  command?: string;
  path?: string;
  patch?: string;
}

const LEADING_CD = /^\s*cd\s+(?:"([^"]+)"|'([^']+)'|(\S+))\s*&&/;
const PATCHED_FILE = /^\[(.+)#[0-9A-F]{4}\]$|^\*\*\* (?:Update|Add|Delete) File: (.+)$/m;
const LINE_SELECTOR = /:[\d+,\-]+$/;

// Mods run without Node's path module, so paths are joined by hand; git reads the result either way.
function absolute(path: string, sessionDir: string, home: string): string {
  if (path.startsWith("/")) return path;
  if (path === "~" || path.startsWith("~/")) return home + path.slice(1);
  return `${sessionDir}/${path}`;
}

function parent(path: string): string {
  return path.slice(0, path.lastIndexOf("/")) || "/";
}

function fileOf(use: ToolUse): string | undefined {
  if (use.path) return use.path.includes("://") ? undefined : use.path.replace(LINE_SELECTOR, "");
  const patched = use.patch ? PATCHED_FILE.exec(use.patch) : null;
  return patched ? (patched[1] ?? patched[2]) : undefined;
}

export function folderOf(use: ToolUse, sessionDir: string, home: string): string | undefined {
  const cd = use.command ? LEADING_CD.exec(use.command) : null;
  const folder = use.cwd ?? (cd ? (cd[1] ?? cd[2] ?? cd[3]) : undefined);
  if (folder) return absolute(folder, sessionDir, home);
  const file = fileOf(use);
  return file ? parent(absolute(file, sessionDir, home)) : undefined;
}
