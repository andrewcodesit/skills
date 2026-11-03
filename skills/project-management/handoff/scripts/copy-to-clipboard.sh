#!/usr/bin/env sh
# Copies stdin to the system clipboard using whichever clipboard tool is available.
# Exit 0 on success; exit 1 with a message on stderr when no clipboard tool exists.
set -eu

input=$(cat)

if command -v pbcopy >/dev/null 2>&1; then
  printf '%s' "$input" | pbcopy
elif [ -n "${WAYLAND_DISPLAY:-}" ] && command -v wl-copy >/dev/null 2>&1; then
  printf '%s' "$input" | wl-copy
elif command -v xclip >/dev/null 2>&1; then
  printf '%s' "$input" | xclip -selection clipboard
elif command -v xsel >/dev/null 2>&1; then
  printf '%s' "$input" | xsel --clipboard --input
elif command -v clip.exe >/dev/null 2>&1; then
  printf '%s' "$input" | clip.exe
else
  echo "No clipboard tool found (pbcopy, wl-copy, xclip, xsel, clip.exe)." >&2
  exit 1
fi

echo "Copied to clipboard."
