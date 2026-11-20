#!/bin/bash
# Usage: swap.sh <photo of parked cars>  -> re-records the app with that photo in the camera, rebuilds the 4-minute video with the voice-over
set -e
cd /tmp/claude-0/-home-user-park-ai/d1e48874-3f4f-56fe-9207-c150746a9463/scratchpad/mk
ffmpeg -y -loglevel error -loop 1 -i "$1" -t 2 -r 5 -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" -pix_fmt yuv420p cam.y4m
rm -rf raw && timeout 420 node rec2.cjs "$PWD/cam.y4m" | tail -1 | cut -c1-300
sed "s#Park-AI-demo-4MIN.mp4#${2:-Park-AI-demo-4MIN.mp4}#" voice4.py > _v4.py && python3 _v4.py | head -1
