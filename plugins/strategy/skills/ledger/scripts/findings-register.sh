#!/usr/bin/env bash
# The findings register: every review finding and how it was resolved, reconciled against the
# verdicts the reviewers actually returned.
#
#   findings-register.sh new <slug> <open|closed|orchestrator> [--security] [dir]
#   findings-register.sh verify <findings.md> --repo <repo> [--tasks <file>]
#
# Rows start with "| F". Severity is CRITICAL, HIGH, MEDIUM or LOW. Dispositions:
#   FIXED         a commit that resolves + a named test + "RED ... GREEN" or "SURVIVED ... KILLED"
#   FIXED-NOTEST  a commit that resolves + why no test closes it (no test, untestable, measured)
#   ACCEPTED      a written rationale
#   TASK #<n>     open loop only, never for a 4a-s or 4b row, never above MEDIUM; <n> must
#                 appear in the --tasks manifest
# Each review step's declared verdict must agree with the number of rows for that step.

set -euo pipefail

# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

usage() {
  sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//' >&2
  exit 2
}

new_register() {
  local slug=$1 loop=$2 security=$3 dir=$4
  local file="$dir/findings-$slug.md"
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
    printf '# Findings register: %s (%s)\n\n' "$slug" "$loop"
    printf '## Declared verdicts\n\nQuote each review verdict exactly as returned; write n/a for a review that did not run.\n\n'
    printf '| step | verdict |\n| --- | --- |\n'
    review_steps_for "$loop" "$security" | while read -r step; do printf '| %s | |\n' "$step"; done
    printf '\n## Findings\n\n'
    printf '| id | step | severity | summary | disposition | evidence |\n| --- | --- | --- | --- | --- | --- |\n'
    printf '| F0 | 4a | LOW | example row, delete this row | ACCEPTED | shows the shape |\n'
  } >"$file"
  printf '%s\n' "$file"
}

named_test() {
  grep -qE '(^|[ (])(test/|tests/|spec/)[^ ]+|\.(sh|bats|rs|py|ts|js|swift)\b|\btest [a-zA-Z_][a-zA-Z0-9_:]*|\btest "[^"]+"' <<<"$1"
}

transition() {
  grep -qE 'RED.*GREEN|SURVIVED.*KILLED' <<<"$1"
}

no_test_reason() {
  grep -qiE 'no test|cannot be tested|untestable|not testable|measured' <<<"$1"
}

SEVERITIES="CRITICAL HIGH MEDIUM LOW"

severity_is_known() {
  local severity=$1 known
  for known in $SEVERITIES; do
    [[ $known == "$severity" ]] && return 0
  done
  return 1
}

# A deferral is refused wherever fixing now is the only honest answer: a closed loop, a security
# or test-quality finding, or anything above MEDIUM. Prints the reason; silent when deferral is allowed.
task_refused_because() {
  local loop=$1 step=$2 severity=$3
  case $loop in open) ;; *) echo "the $loop loop fixes or accepts every finding in this round" && return ;; esac
  case $step in 4a-s) echo "a security finding is fixed in this round at any severity" && return ;; esac
  case $step in 4b) echo "a test-quality finding is fixed in place by 4b" && return ;; esac
  case $severity in CRITICAL | HIGH) echo "a $severity finding is fixed in this round" && return ;; esac
}

verify_register() {
  local file=$1 repo=$2 tasks=$3
  local loop security failures=0 fixed=0 deferred=0
  [[ -f $file ]] || {
    fail_line "no such register: $file"
    exit 2
  }
  loop=$(loop_of_file "$file")
  loop_is_known "$loop" || {
    fail_line "title line names no known loop: $(head -n 1 "$file")"
    exit 1
  }
  security=$(security_of_file "$file")

  declare -A rows_per_step=()
  while IFS= read -r row; do
    local id step severity disposition evidence summary
    id=$(cell "$row" 1)
    step=$(cell "$row" 2)
    severity=$(cell "$row" 3)
    summary=$(cell "$row" 4)
    disposition=$(cell "$row" 5)
    evidence=$(cell "$row" 6)
    grep -qi 'delete this row' <<<"$summary" && continue
    rows_per_step[$step]=$((${rows_per_step[$step]:-0} + 1))
    severity_is_known "$severity" || {
      fail_line "$id: severity '$severity' is not one of: $SEVERITIES"
      failures=$((failures + 1))
    }
    case $disposition in
      FIXED)
        commit_resolves "$evidence" "$repo" || {
          fail_line "$id: FIXED without a commit that resolves"
          failures=$((failures + 1))
        }
        named_test "$evidence" || {
          fail_line "$id: FIXED without a named test"
          failures=$((failures + 1))
        }
        transition "$evidence" || {
          fail_line "$id: FIXED without RED ... GREEN or SURVIVED ... KILLED"
          failures=$((failures + 1))
        }
        fixed=$((fixed + 1))
        ;;
      FIXED-NOTEST)
        commit_resolves "$evidence" "$repo" || {
          fail_line "$id: FIXED-NOTEST without a commit that resolves"
          failures=$((failures + 1))
        }
        no_test_reason "$evidence" || {
          fail_line "$id: FIXED-NOTEST without saying why no test closes it"
          failures=$((failures + 1))
        }
        fixed=$((fixed + 1))
        ;;
      ACCEPTED)
        [[ -n $evidence ]] || {
          fail_line "$id: ACCEPTED without a rationale"
          failures=$((failures + 1))
        }
        ;;
      TASK\ \#*)
        local n=${disposition#TASK #} refused
        refused=$(task_refused_because "$loop" "$step" "$severity")
        if [[ -n $refused ]]; then
          fail_line "$id: TASK refused: $refused; fix it or accept it with a rationale"
          failures=$((failures + 1))
        elif [[ -z $tasks ]]; then
          fail_line "$id: defers to TASK #$n but no --tasks manifest was given"
          failures=$((failures + 1))
        elif ! grep -qE "(^|[^0-9])#?$n([^0-9]|$)" "$tasks"; then
          fail_line "$id: TASK #$n is not in $tasks"
          failures=$((failures + 1))
        fi
        deferred=$((deferred + 1))
        ;;
      *)
        fail_line "$id: unknown disposition '$disposition'"
        failures=$((failures + 1))
        ;;
    esac
  done < <(grep -E '^\| *F[0-9]' "$file")

  local step verdict expected
  for step in $(review_steps_for "$loop" "$security"); do
    verdict=$(grep -E "^\| *$step *\|" "$file" | head -n 1 | awk -F'|' '{ gsub(/^ +| +$/, "", $3); print $3 }')
    if [[ -z $verdict ]]; then
      fail_line "step $step: no declared verdict"
      failures=$((failures + 1))
      continue
    fi
    expected=$(verdict_count "$verdict")
    local actual=${rows_per_step[$step]:-0}
    case $expected in
      n/a) ((actual == 0)) || {
        fail_line "step $step: verdict n/a but $actual row(s) cite it"
        failures=$((failures + 1))
      } ;;
      fail)
        fail_line "step $step: verdict '$verdict' cannot be read as a count (quote CLEAN, NO_ISSUE, VERDICT: PASS, (N) or 'N findings')"
        failures=$((failures + 1))
        ;;
      *) ((actual == expected)) || {
        fail_line "step $step: verdict declares $expected finding(s), the register holds $actual row(s)"
        failures=$((failures + 1))
      } ;;
    esac
  done

  if ((deferred > 0 && deferred >= fixed)); then
    printf 'OVER-DEFERRAL: %d deferred, %d fixed; say why in the PR body\n' "$deferred" "$fixed" >&2
  fi
  if ((failures > 0)); then
    fail_line "$failures problem(s); not clear to merge"
    exit 1
  fi
  printf 'register ok: every finding resolved, verdicts reconcile (%d fixed, %d deferred)\n' "$fixed" "$deferred"
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
      new_register "$slug" "$loop" "$security" "$dir"
      ;;
    verify)
      local file=${1:-} repo="" tasks=""
      shift || usage
      while (($#)); do
        case $1 in
          --repo)
            repo=${2:-}
            shift 2
            ;;
          --tasks)
            tasks=${2:-}
            shift 2
            ;;
          *) usage ;;
        esac
      done
      [[ -n $file ]] || usage
      verify_register "$file" "$repo" "$tasks"
      ;;
    *) usage ;;
  esac
}

main "$@"
