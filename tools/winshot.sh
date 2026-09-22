#!/usr/bin/env bash
# Real-GPU screenshot through Windows Chrome: tools/winshot.sh "<url>" <outname.png> [frames] [w] [h]
set -e
WD=/mnt/c/Users/micha/ffttest
cd "$WD"
"/mnt/c/Program Files/nodejs/node.exe" shot.cjs "$1" "C:\\Users\\micha\\ffttest\\$2" "${3:-60}" "${4:-1600}" "${5:-900}" 2>&1 | grep -v "\[vite\]"
cp "$WD/$2" /home/micha/dev/cco55-t1/tools/out/"$2"; for f in "$WD"/"${2%.png}"_*.png; do [ -f "$f" ] && cp "$f" /home/micha/dev/cco55-t1/tools/out/; done; true
