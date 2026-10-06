#!/usr/bin/env bash
# The merge gate: run both verifiers, post their output on the pull request, print the merge
# command. It never merges for you; the PR comment is the artifact that proves the gates ran.
#
#   pipeline-merge.sh <pr> <slug> --repo <repo> --dir <ledger dir> [--tasks <file>]

set -euo pipefail

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

usage() {
  sed -n '2,5p' "$0" | sed 's/^# \{0,1\}//' >&2
  exit 2
}

main() {
  local pr=${1:-} slug=${2:-} repo="" dir="" tasks=""
  shift 2 2>/dev/null || usage
  while (($#)); do
    case $1 in
      --repo)
        repo=${2:-}
        shift 2
        ;;
      --dir)
        dir=${2:-}
        shift 2
        ;;
      --tasks)
        tasks=${2:-}
        shift 2
        ;;
      *) usage ;;
    esac
  done
  [[ -n $pr && -n $slug && -n $repo && -n $dir ]] || usage

  local checklist="$dir/checklist-$slug.md" register="$dir/findings-$slug.md"
  local output status=0
  output=$(
    "$here/slice-checklist.sh" verify "$checklist" --repo "$repo" 2>&1 || status=1
    if [[ -n $tasks ]]; then
      "$here/findings-register.sh" verify "$register" --repo "$repo" --tasks "$tasks" 2>&1 || status=1
    else
      "$here/findings-register.sh" verify "$register" --repo "$repo" 2>&1 || status=1
    fi
    exit $status
  ) || status=1

  printf '%s\n' "$output"
  if ((status != 0)); then
    printf 'pipeline-merge: a gate failed; not posting, not merging\n' >&2
    exit 1
  fi

  # shellcheck disable=SC2016  # the backticks are a markdown code fence, not a command
  gh pr comment "$pr" --repo "$(git -C "$repo" remote get-url origin)" --body "$(printf 'Slice %s gates:\n\n```\n%s\n```\n' "$slug" "$output")" >/dev/null
  printf '\nGates passed and posted on PR %s. Merge with:\n  gh pr merge %s --squash --delete-branch\n' "$pr" "$pr"
}

main "$@"
