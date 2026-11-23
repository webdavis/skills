#!/bin/sh
set -eu

if [ "$#" -gt 1 ]; then
  echo "usage: changed-files.sh [starting point]" >&2
  exit 2
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "not a git repository" >&2
  exit 2
fi

start=${1:-}
if [ -z "$start" ]; then
  start=$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD || true)
fi
if [ -z "$start" ]; then
  for branch in main master; do
    if git rev-parse --verify --quiet "$branch" >/dev/null; then
      start=$branch
      break
    fi
  done
fi
if [ -z "$start" ]; then
  echo "no default branch found; name a starting point with --changed=<ref>" >&2
  exit 2
fi

base=$(git merge-base "$start" HEAD)
echo "start $start"
echo "base $base"
git diff --name-status -M "$base"
git ls-files --others --exclude-standard | while IFS= read -r path; do
  printf 'A\t%s\n' "$path"
done
