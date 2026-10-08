#!/usr/bin/env bash
# Proves the two verifiers can both pass and fail. Run it after editing them.
#   self-check.sh        prints one line per case; exits 1 if any case is wrong

set -uo pipefail

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

repo="$work/repo"
git init -q "$repo"
git -C "$repo" -c user.name=t -c user.email=t@t -c commit.gpgsign=false commit -q --allow-empty -m init
sha=$(git -C "$repo" rev-parse --short HEAD)
ledgers="$work/ledgers"

bad=0
expect() {
  # expect <pass|fail> <label> <command...>
  local want=$1 label=$2
  shift 2
  if "$@" >/dev/null 2>&1; then got=pass; else got=fail; fi
  if [[ $got == "$want" ]]; then
    printf 'ok    %s (%s)\n' "$label" "$got"
  else
    printf 'WRONG %s: wanted %s, got %s\n' "$label" "$want" "$got"
    bad=1
  fi
}

tick() {
  # tick <file> <step> <mark> <evidence>: fill one checklist row
  local file=$1 step=$2 mark=$3 evidence=$4
  python3 - "$file" "$step" "$mark" "$evidence" <<'EOF'
import sys, re
f, step, mark, ev = sys.argv[1:]
lines = open(f).read().split("\n")
for i, l in enumerate(lines):
    cells = [c.strip() for c in l.split("|")]
    if len(cells) > 3 and cells[2] == step and cells[1].startswith("["):
        cells[1] = mark; cells[5] = ev
        lines[i] = "| " + " | ".join(cells[1:6]) + " |"
open(f, "w").write("\n".join(lines))
EOF
}

set_verdict() {
  local file=$1 step=$2 verdict=$3
  sed -i '' "s/^| $step | |$/| $step | $verdict |/" "$file"
}

add_row() {
  # add_row <file> <cells joined with |>
  local file=$1
  shift
  printf '| %s |\n' "$*" >>"$file"
}

# --- checklist, open loop ---
"$here/slice-checklist.sh" new demo open "$ledgers" >/dev/null
cl="$ledgers/checklist-demo.md"
expect fail "fresh checklist is not clear" "$here/slice-checklist.sh" verify "$cl" --repo "$repo"
touch "$ledgers/brief.md" "$ledgers/notes.md" "$ledgers/findings-demo.md"
tick "$cl" 1 '[x]' 'brief.md'
tick "$cl" 2 '[x]' 'VERDICT: NO_ISSUE'
tick "$cl" 3 '[x]' "$sha"
tick "$cl" 4a '[x]' 'FINDINGS (1) NEW_ISSUE'
tick "$cl" 4b '[x]' 'VERDICT: CLEAN'
tick "$cl" 4c '[x]' 'notes.md'
tick "$cl" 5 '[x]' 'findings-demo.md'
tick "$cl" 6 '[x]' "$sha"
tick "$cl" 7 '[x]' 'VERDICT: NO_ISSUE'
tick "$cl" 8 '[x]' 'none'
tick "$cl" 9 '[x]' '#42'
expect pass "complete open checklist" "$here/slice-checklist.sh" verify "$cl" --repo "$repo"
tick "$cl" 3 '[x]' 'deadbeef'
expect fail "commit that does not resolve" "$here/slice-checklist.sh" verify "$cl" --repo "$repo"
tick "$cl" 3 '[x]' "$sha"
tick "$cl" 7 '[x]' 'looked clean to me'
expect fail "review step without a quoted verdict" "$here/slice-checklist.sh" verify "$cl" --repo "$repo"
tick "$cl" 7 '[DEV]' 'reviewer unavailable twice; substituted 4b fixes'
expect fail "[DEV] without a Deviations line" "$here/slice-checklist.sh" verify "$cl" --repo "$repo"
printf -- '- 7: reviewer unavailable twice; substituted 4b fixes\n' >>"$cl"
expect pass "[DEV] with a Deviations line" "$here/slice-checklist.sh" verify "$cl" --repo "$repo"

# --- checklist, orchestrator has no step 2 ---
"$here/slice-checklist.sh" new orch orchestrator "$ledgers" >/dev/null
expect fail "orchestrator table rejects a step 2 row" bash -c "printf '| [x] | 2 | x | verdict | VERDICT: NO_ISSUE |\n' >> '$ledgers/checklist-orch.md' && '$here/slice-checklist.sh' verify '$ledgers/checklist-orch.md' --repo '$repo'"

# --- register, open loop ---
rm -f "$ledgers/findings-demo.md"
"$here/findings-register.sh" new demo open "$ledgers" >/dev/null
rg="$ledgers/findings-demo.md"
expect fail "fresh register has no verdicts" "$here/findings-register.sh" verify "$rg" --repo "$repo"
set_verdict "$rg" 2 'VERDICT: NO_ISSUE'
set_verdict "$rg" 4a 'FINDINGS (2)'
set_verdict "$rg" 4b 'VERDICT: CLEAN'
set_verdict "$rg" 7 'VERDICT: NO_ISSUE'
add_row "$rg" "F1 | 4a | HIGH | guard off by one | FIXED | $sha test \"boundary at 10\" RED to GREEN"
add_row "$rg" "F2 | 4a | LOW | naming | TASK #7"
expect fail "TASK row without a manifest" "$here/findings-register.sh" verify "$rg" --repo "$repo"
printf '#7 rename the helper\n' >"$ledgers/tasks.txt"
expect pass "open register with one fix and one filed task" "$here/findings-register.sh" verify "$rg" --repo "$repo" --tasks "$ledgers/tasks.txt"
add_row "$rg" "F3 | 4a | LOW | extra | ACCEPTED | fine as is"
expect fail "verdict count disagrees with the rows" "$here/findings-register.sh" verify "$rg" --repo "$repo" --tasks "$ledgers/tasks.txt"
set_verdict "$rg" 4a 'FINDINGS (3)'
sed -i '' 's/FINDINGS (2)/FINDINGS (3)/' "$rg"
expect pass "verdict count corrected" "$here/findings-register.sh" verify "$rg" --repo "$repo" --tasks "$ledgers/tasks.txt"
add_row "$rg" "F4 | 4b | HIGH | assertion cannot fail | FIXED | $sha test/guard.sh SURVIVED then KILLED"
expect fail "4b row against a CLEAN verdict" "$here/findings-register.sh" verify "$rg" --repo "$repo" --tasks "$ledgers/tasks.txt"
sed -i '' 's/| 4b | VERDICT: CLEAN |/| 4b | 1 finding, NEW_ISSUE |/' "$rg"
expect pass "4b verdict now declares the row" "$here/findings-register.sh" verify "$rg" --repo "$repo" --tasks "$ledgers/tasks.txt"
add_row "$rg" "F5 | 7 | LOW | comment typo | FIXED | $sha"
sed -i '' 's/| 7 | VERDICT: NO_ISSUE |/| 7 | 1 finding |/' "$rg"
expect fail "FIXED without a named test and transition" "$here/findings-register.sh" verify "$rg" --repo "$repo" --tasks "$ledgers/tasks.txt"
sed -i '' "s/| F5 | 7 | LOW | comment typo | FIXED | $sha |/| F5 | 7 | LOW | comment typo | FIXED | $sha sum.sh RED then GREEN |/" "$rg"
expect fail "a production file is not a named test" "$here/findings-register.sh" verify "$rg" --repo "$repo" --tasks "$ledgers/tasks.txt"
sed -i '' "s/| F5 | 7 | LOW | comment typo | FIXED | $sha sum.sh RED then GREEN |/| F5 | 7 | LOW | comment typo | FIXED | $sha |/" "$rg"
sed -i '' "s/| F5 | 7 | LOW | comment typo | FIXED | $sha |/| F5 | 7 | LOW | comment typo | FIXED-NOTEST | $sha, a comment; no test can see it |/" "$rg"
expect pass "FIXED-NOTEST with a reason" "$here/findings-register.sh" verify "$rg" --repo "$repo" --tasks "$ledgers/tasks.txt"
sed -i '' 's/^| 2 | VERDICT: NO_ISSUE |$/| 2 | FINDINGS (1) |/' "$rg"
add_row "$rg" "F6 | 2 | LOW | brief gap | FIXED-NOTEST | fixed in the brief; no test"
expect fail "a step 2 FIXED-NOTEST without the brief path" "$here/findings-register.sh" verify "$rg" --repo "$repo" --tasks "$ledgers/tasks.txt"
sed -i '' 's/| F6 | 2 | LOW | brief gap | FIXED-NOTEST | fixed in the brief; no test |/| F6 | 2 | LOW | brief gap | FIXED-NOTEST | brief.md, fixed in the brief; no test |/' "$rg"
expect pass "a step 2 FIXED-NOTEST citing the brief" "$here/findings-register.sh" verify "$rg" --repo "$repo" --tasks "$ledgers/tasks.txt"
sed -i '' '/^| F6 | 2 |/d' "$rg"
sed -i '' 's/^| 2 | FINDINGS (1) |$/| 2 | VERDICT: NO_ISSUE |/' "$rg"

# --- register, open loop: which rows may defer ---
printf '#8 later\n' >>"$ledgers/tasks.txt"
sed -i '' 's/| F3 | 4a | LOW | extra | ACCEPTED | fine as is |/| F3 | 4a | HIGH | extra | TASK #8 |/' "$rg"
expect fail "a HIGH finding may not defer" "$here/findings-register.sh" verify "$rg" --repo "$repo" --tasks "$ledgers/tasks.txt"
sed -i '' 's/| F3 | 4a | HIGH | extra | TASK #8 |/| F3 | 4a | MEDIUM | extra | TASK #8 |/' "$rg"
expect pass "a MEDIUM finding may defer" "$here/findings-register.sh" verify "$rg" --repo "$repo" --tasks "$ledgers/tasks.txt"
sed -i '' 's/| F3 | 4a | MEDIUM | extra | TASK #8 |/| F3 | 4a | SEVERE | extra | TASK #8 |/' "$rg"
expect fail "unknown severity word" "$here/findings-register.sh" verify "$rg" --repo "$repo" --tasks "$ledgers/tasks.txt"
sed -i '' 's/| F3 | 4a | SEVERE | extra | TASK #8 |/| F3 | 4a | LOW | extra | ACCEPTED | fine as is |/' "$rg"
sed -i '' "s/| F4 | 4b | HIGH | assertion cannot fail | FIXED | $sha test\/guard.sh SURVIVED then KILLED |/| F4 | 4b | LOW | assertion cannot fail | TASK #8 |/" "$rg"
expect fail "a 4b finding may not defer" "$here/findings-register.sh" verify "$rg" --repo "$repo" --tasks "$ledgers/tasks.txt"

# --- register, security review rows never defer ---
"$here/findings-register.sh" new sec open --security "$ledgers" >/dev/null
rs="$ledgers/findings-sec.md"
set_verdict "$rs" 2 'VERDICT: NO_ISSUE'
set_verdict "$rs" 4a 'VERDICT: NO_ISSUE'
set_verdict "$rs" 4a-s 'FINDINGS (1)'
set_verdict "$rs" 4b 'VERDICT: NO_ISSUE'
set_verdict "$rs" 7 'VERDICT: NO_ISSUE'
add_row "$rs" "F1 | 4a-s | LOW | header echoed | TASK #8"
expect fail "a security finding may not defer" "$here/findings-register.sh" verify "$rs" --repo "$repo" --tasks "$ledgers/tasks.txt"
sed -i '' 's/| F1 | 4a-s | LOW | header echoed | TASK #8 |/| F1 | 4a-s | LOW | header echoed | ACCEPTED | the header is public |/' "$rs"
expect pass "same security finding accepted with a rationale" "$here/findings-register.sh" verify "$rs" --repo "$repo" --tasks "$ledgers/tasks.txt"

# --- register, closed loop refuses TASK and reads FAIL as not clean ---
"$here/findings-register.sh" new cl closed "$ledgers" >/dev/null
rc="$ledgers/findings-cl.md"
set_verdict "$rc" 2 'VERDICT: NO_ISSUE'
set_verdict "$rc" 4a 'VERDICT: NO_ISSUE'
set_verdict "$rc" 4b 'VERDICT: NO_ISSUE'
set_verdict "$rc" 6v 'VERDICT: PASS'
expect pass "clean closed register" "$here/findings-register.sh" verify "$rc" --repo "$repo"
add_row "$rc" "F1 | 4a | LOW | later | TASK #1"
sed -i '' 's/| 4a | VERDICT: NO_ISSUE |/| 4a | FINDINGS (1) |/' "$rc"
expect fail "closed loop refuses TASK" "$here/findings-register.sh" verify "$rc" --repo "$repo"
sed -i '' 's/| F1 | 4a | LOW | later | TASK #1 |/| F1 | 4a | LOW | later | ACCEPTED | out of the diff |/' "$rc"
expect pass "same finding accepted with a rationale" "$here/findings-register.sh" verify "$rc" --repo "$repo"
sed -i '' 's/| 6v | VERDICT: PASS |/| 6v | VERDICT: FAIL |/' "$rc"
expect fail "6v FAIL never reads as clean" "$here/findings-register.sh" verify "$rc" --repo "$repo"

if ((bad)); then
  printf 'self-check: FAILED\n' >&2
  exit 1
fi
printf 'self-check: all cases behave\n'
