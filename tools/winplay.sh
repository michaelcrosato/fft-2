#!/usr/bin/env bash
# tools/winplay.sh "<url>" steps.json   (steps file relative to repo; screenshots → tools/out/)
set -e
WD=/mnt/c/Users/micha/ffttest
mkdir -p "$WD/out"
cp "$2" "$WD/steps.json"
cd "$WD"
rm -f "$WD"/out/*.png
"/mnt/c/Program Files/nodejs/node.exe" play.cjs "$1" "C:\\Users\\micha\\ffttest\\steps.json" "C:\\Users\\micha\\ffttest\\out" "${3:-1600}" "${4:-900}" 2>&1 | grep -v "\[vite\]\|powerPreference\|PCFSoftShadow" || true
cp "$WD"/out/*.png /home/micha/dev/cco55-t1/tools/out/ 2>/dev/null || true
