#!/usr/bin/env bash
# Shared by slice-checklist.sh and findings-register.sh. Source it; do not run it.
# shellcheck shell=bash

LOOPS="open closed orchestrator"

# The step tables. One line per step: id|kind|what. Kinds:
#   path     a file that must exist (relative to the ledger directory or absolute)
#   commit   a commit that must resolve in --repo
#   verdict  text that quotes a review verdict (see verdict_token)
#   text     any non-empty text (task numbers, a PR number)
steps_for() {
  local loop=$1 security=$2
  case $loop in
    open)
      printf '%s\n' '1|path|Read the plan and the spec, write the brief, log it'
      printf '%s\n' '2|verdict|Review the brief before any code exists'
      ;;
    closed)
      printf '%s\n' '1|path|Re-measure the task against main, write the brief, log it'
      printf '%s\n' '2|verdict|Review the brief before any code exists'
      ;;
    orchestrator)
      printf '%s\n' '1|commit|Write the failing tests and the seams (the red commit)'
      ;;
    *) return 1 ;;
  esac
  printf '%s\n' '3|commit|Implement test-first, mutation-verified against an unmutated control'
  printf '%s\n' '4a|verdict|Review correctness (read-only reviewer)'
  if [[ $security == yes ]]; then
    printf '%s\n' '4a-s|verdict|Review the security lens'
  fi
  printf '%s\n' '4b|verdict|Review test quality and mutate, in its own worktree; fixes in place'
  printf '%s\n' '4c|path|Independent read by the orchestrator (notes)'
  printf '%s\n' '5|path|Adjudicate: reproduce every finding (the register)'
  printf '%s\n' '6|commit|Fix the 4a and 4c findings'
  case $loop in
    open)
      printf '%s\n' '7|verdict|Re-review the fix, exactly once'
      printf '%s\n' '8|text|Open findings become tasks (task numbers, or none)'
      ;;
    closed | orchestrator)
      printf '%s\n' '6v|verdict|Terminal verification: gates run, fixes in place (PASS or FAIL)'
      ;;
  esac
  printf '%s\n' '9|text|Gates, push, PR, merge (the PR number)'
}

review_steps_for() {
  local loop=$1 security=$2
  steps_for "$loop" "$security" | awk -F'|' '$2 == "verdict" { print $1 }'
}

loop_is_known() {
  local loop=$1 known
  for known in $LOOPS; do
    [[ $known == "$loop" ]] && return 0
  done
  return 1
}

# The loop name is written into the ledger's title line: "# ... (<loop>)".
loop_of_file() {
  local file=$1
  sed -n '1s/.*(\([a-z]*\)).*/\1/p' "$file"
}

security_of_file() {
  local file=$1
  if grep -q '^| *\[.*| *4a-s *|' "$file" || grep -q '^| *4a-s *|' "$file"; then
    echo yes
  else
    echo no
  fi
}

# Evidence kinds. Each prints nothing and returns 0 when the evidence holds.
commit_resolves() {
  local evidence=$1 repo=$2 sha
  sha=$(grep -oE '\b[0-9a-f]{7,40}\b' <<<"$evidence" | head -n 1)
  [[ -n $sha && -n $repo ]] || return 1
  git -C "$repo" cat-file -e "$sha^{commit}" 2>/dev/null
}

path_exists() {
  local evidence=$1 dir=$2 candidate
  for candidate in $evidence; do
    candidate=${candidate%[,.;:]}
    case $candidate in
      /*) [[ -e $candidate ]] && return 0 ;;
      */* | *.md | *.txt | *.sh) [[ -e $dir/$candidate ]] && return 0 ;;
    esac
  done
  return 1
}

# A review's evidence must quote the verdict. Quoting forces reading.
verdict_token() {
  local evidence=$1
  grep -qE 'VERDICT:|"verdict":|NO_ISSUE|NEW_ISSUE|INCOMPLETE' <<<"$evidence"
}

# The number of findings a quoted verdict declares, or "n/a", or "fail" when the
# verdict cannot be read. FAIL is never zero: a failed verification must not read as clean.
verdict_count() {
  local verdict=$1 n
  case $verdict in
    n/a | N/A)
      echo n/a
      return
      ;;
  esac
  if grep -qE 'FAIL|NEW_ISSUE|INCOMPLETE' <<<"$verdict" && ! grep -qE '\([0-9]+\)|[0-9]+ finding' <<<"$verdict"; then
    echo fail
    return
  fi
  if
    n=$(grep -oE '\(([0-9]+)\)' <<<"$verdict" | head -n 1 | tr -d '()')
    [[ -n $n ]]
  then
    echo "$n"
    return
  fi
  if
    n=$(grep -oE '[0-9]+ finding' <<<"$verdict" | head -n 1 | grep -oE '[0-9]+')
    [[ -n $n ]]
  then
    echo "$n"
    return
  fi
  if grep -qE 'CLEAN|NO_ISSUE|VERDICT: *PASS' <<<"$verdict"; then
    echo 0
    return
  fi
  echo fail
}

cell() {
  # cell <row> <n>: the n-th cell of a markdown table row, trimmed.
  local row=$1 n=$2
  awk -F'|' -v n="$((n + 1))" '{ gsub(/^ +| +$/, "", $n); print $n }' <<<"$row"
}

fail_line() {
  printf '%s: %s\n' "$(basename "$0")" "$*" >&2
}
