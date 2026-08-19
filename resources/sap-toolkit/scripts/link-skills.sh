#!/usr/bin/env bash
# ============================================================================
# link-skills.sh — install all sap-toolkit skills into a PROJECT's
#                  .axet-code/skills/ directory.
#
# aXet.code scans the PROJECT-level .axet-code/skills/ directory (relative to the
# folder you launch it in), NOT a user-global one, and it discovers skills at
# STARTUP. Run this once per project, then (RE)START aXet.code in that project.
#
# Usage:
#   scripts/link-skills.sh [--copy] [TARGET_PROJECT_DIR]
#     --copy              Copy REAL folders instead of symlinking. Use this if
#                         aXet.code doesn't discover symlinked skills (some
#                         scanners skip links). Re-run after `git pull` to refresh.
#     TARGET_PROJECT_DIR  Defaults to the current directory.
#
# Re-runnable: it removes any existing entry of the same name first.
# ============================================================================
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="link"
TARGET="$PWD"
for arg in "$@"; do
  case "$arg" in
    --copy) MODE="copy" ;;
    *)      TARGET="$arg" ;;
  esac
done
DEST="$TARGET/.axet-code/skills"

# skill-name  =>  path relative to repo root
declare -a SKILLS=(
  "sap-adt-readonly:abaper/skills/sap-adt-readonly"
  "clean-core:abaper/skills/clean-core"
  "sap-docs:abaper/skills/sap-docs"
  "screen-gen:abaper/skills/screen-gen"
  "fs2ts:abaper/skills/fs2ts"
  "fs-generator:abaper/skills/fs-generator"
  "abapgit-workflow:abapgit-bridge/skills/abapgit-workflow"
  "abapgit-export-zip:abapgit-bridge/skills/abapgit-export-zip"
  "abapgit-import-status-zip:abapgit-bridge/skills/abapgit-import-status-zip"
  "abapgit-howto:abapgit-bridge/skills/abapgit-howto"
  "office-excel-read:office-tools/skills/office-excel-read"
  "office-excel-write:office-tools/skills/office-excel-write"
  "office-excel-transform:office-tools/skills/office-excel-transform"
  "office-excel-report:office-tools/skills/office-excel-report"
  "office-excel-compare:office-tools/skills/office-excel-compare"
  "office-excel-images:office-tools/skills/office-excel-images"
  "office-slides:office-tools/skills/office-slides"
  "office-pdf:office-tools/skills/office-pdf"
  "office-pptx:office-tools/skills/office-pptx"
  "office-docx:office-tools/skills/office-docx"
  "office-manual:office-tools/skills/office-manual"
)

mkdir -p "$DEST"
echo "Repo:   $REPO"
echo "Target: $DEST"
echo "Mode:   $MODE"
n=0
for entry in "${SKILLS[@]}"; do
  name="${entry%%:*}"; rel="${entry#*:}"
  src="$REPO/$rel"
  if [[ ! -f "$src/SKILL.md" ]]; then
    echo "  ! SKIP $name — no SKILL.md at $src" >&2; continue
  fi
  rm -rf "$DEST/$name"
  if [[ "$MODE" == "copy" ]]; then
    cp -r "$src" "$DEST/$name"
  else
    ln -s "$src" "$DEST/$name"
  fi
  echo "  + $name"
  n=$((n+1))
done
echo "Installed $n skills ($MODE). RESTART aXet.code in this project to discover them."
[[ "$MODE" == "copy" ]] && echo "Note: copies are a snapshot — re-run with --copy after 'git pull' to refresh."
exit 0
