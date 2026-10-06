#!/usr/bin/env bash
# The slice checklist: one row per pipeline step, ticked only with evidence that resolves.
#
#   slice-checklist.sh new <slug> <open|closed|orchestrator> [--security] [dir]
#   slice-checklist.sh verify <checklist.md> --repo <repo>
#   slice-checklist.sh steps <open|closed|orchestrator> [--security]
#
# verify exits 0 when every step is ticked ([x]) with evidence of the right kind, or marked
# [DEV] with a reason in its evidence cell and a matching line under "## Deviations".

set -euo pipefail

# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

usage() {
  sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//' >&2
  exit 2
}

new_checklist() {
  local slug=$1 loop=$2 security=$3 dir=$4
  local file="$dir/checklist-$slug.md"
  loop_is_known "$loop" || {
    fail_line "unknown loop: $loop (one of: $LOOPS)"
    exit 2
  }
  [[ -e $file ]] && {
    fail_line "$file exists; a second new is not a reset"
    exit 1
  }
  mkdir -p "$dir"
  {
    printf '# Slice checklist: %s (%s)\n\n' "$slug" "$loop"
    printf 'Tick a box only when its evidence names something that exists. Review steps quote the verdict.\n\n'
    printf '| done | step | what | kind | evidence |\n| --- | --- | --- | --- | --- |\n'
    steps_for "$loop" "$security" | while IFS='|' read -r id kind what; do
      printf '| [ ] | %s | %s | %s | |\n' "$id" "$what" "$kind"
    done
    printf '\n## Deviations\n\n'
  } >"$file"
  printf '%s\n' "$file"
}

print_steps() {
  local loop=$1 security=$2
  loop_is_known "$loop" || {
    fail_line "unknown loop: $loop (one of: $LOOPS)"
    exit 2
  }
  printf 'step\tkind\twhat\n'
  steps_for "$loop" "$security" | awk -F'|' '{ printf "%s\t%s\t%s\n", $1, $2, $3 }'
}

deviation_named() {
  local file=$1 id=$2
  awk '/^## Deviations/ { on = 1; next } on' "$file" | grep -qE "(^|[^0-9a-z])$id([^0-9a-z]|$)"
}

verify_checklist() {
  local file=$1 repo=$2
  local dir loop security failures=0 seen=""
  [[ -f $file ]] || {
    fail_line "no such checklist: $file"
    exit 2
  }
  dir=$(cd "$(dirname "$file")" && pwd)
  loop=$(loop_of_file "$file")
  loop_is_known "$loop" || {
    fail_line "title line names no known loop: $(head -n 1 "$file")"
    exit 1
  }
  security=$(security_of_file "$file")

  while IFS= read -r row; do
    local mark id kind evidence
    mark=$(cell "$row" 1)
    id=$(cell "$row" 2)
    kind=$(cell "$row" 4)
    evidence=$(cell "$row" 5)
    seen="$seen $id"
    local expected
    expected=$(steps_for "$loop" "$security" | awk -F'|' -v id="$id" '$1 == id { print $2 }')
    if [[ -z $expected ]]; then
      fail_line "step $id is not a $loop step"
      failures=$((failures + 1))
      continue
    fi
    if [[ $kind != "$expected" ]]; then
      fail_line "step $id: kind is $kind, the $loop table says $expected"
      failures=$((failures + 1))
      continue
    fi
    case $mark in
      '[x]' | '[X]') ;;
      '[DEV]')
        if [[ -z $evidence ]]; then
          fail_line "step $id: [DEV] with an empty evidence cell"
          failures=$((failures + 1))
        elif ! deviation_named "$file" "$id"; then
          fail_line "step $id: [DEV] but no line under ## Deviations names it"
          failures=$((failures + 1))
        fi
        continue
        ;;
      *)
        fail_line "step $id: not ticked"
        failures=$((failures + 1))
        continue
        ;;
    esac
    if [[ -z $evidence ]]; then
      fail_line "step $id: ticked with no evidence"
      failures=$((failures + 1))
      continue
    fi
    case $kind in
      commit) commit_resolves "$evidence" "$repo" || {
        fail_line "step $id: no commit in '$evidence' resolves in $repo (pass --repo)"
        failures=$((failures + 1))
      } ;;
      path) path_exists "$evidence" "$dir" || {
        fail_line "step $id: no path in '$evidence' exists"
        failures=$((failures + 1))
      } ;;
      verdict) verdict_token "$evidence" || {
        fail_line "step $id: evidence quotes no verdict (VERDICT:, NO_ISSUE, NEW_ISSUE, INCOMPLETE)"
        failures=$((failures + 1))
      } ;;
      text) ;;
    esac
  done < <(grep -E '^\| *\[' "$file")

  local id
  for id in $(steps_for "$loop" "$security" | cut -d'|' -f1); do
    case " $seen " in *" $id "*) ;; *)
      fail_line "step $id is missing from the table"
      failures=$((failures + 1))
      ;;
    esac
  done

  if ((failures > 0)); then
    fail_line "$failures problem(s); not clear to merge"
    exit 1
  fi
  printf 'checklist ok: every %s step has evidence that resolves\n' "$loop"
}

main() {
  local command=${1:-}
  shift || usage
  case $command in
    new)
      local slug=${1:-} loop=${2:-} security=no dir=.
      shift 2 2>/dev/null || usage
      for arg in "$@"; do
        case $arg in --security) security=yes ;; *) dir=$arg ;; esac
      done
      [[ -n $slug && -n $loop ]] || usage
      new_checklist "$slug" "$loop" "$security" "$dir"
      ;;
    verify)
      local file=${1:-} repo=""
      shift || usage
      while (($#)); do
        case $1 in --repo)
          repo=${2:-}
          shift 2
          ;;
        *) usage ;; esac
      done
      [[ -n $file ]] || usage
      verify_checklist "$file" "$repo"
      ;;
    steps)
      local loop=${1:-} security=no
      [[ ${2:-} == --security ]] && security=yes
      [[ -n $loop ]] || usage
      print_steps "$loop" "$security"
      ;;
    *) usage ;;
  esac
}

main "$@"
