#!/usr/bin/env bash
# Copies stdin to the clipboard with whatever the machine has and prints the tool it used.
# PYLON_NOTE_CLIPBOARD_CMD replaces the tool (test runs set it so they never touch a real clipboard).
set -euo pipefail
if [[ -n ${PYLON_NOTE_CLIPBOARD_CMD:-} ]]; then
  eval "$PYLON_NOTE_CLIPBOARD_CMD"
  printf 'copied with: %s\n' "$PYLON_NOTE_CLIPBOARD_CMD"
  exit
fi
for tool in pbcopy wl-copy xclip clip.exe; do
  command -v "$tool" >/dev/null 2>&1 || continue
  case $tool in
    xclip) xclip -selection clipboard ;;
    *) "$tool" ;;
  esac
  printf 'copied with %s\n' "$tool"
  exit
done
printf 'no clipboard tool found (pbcopy, wl-copy, xclip, clip.exe); copy the reply by hand\n' >&2
exit 1
