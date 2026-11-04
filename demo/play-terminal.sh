#!/usr/bin/env bash
# Replay the pre-recorded terminal beats at natural speed, so the terminal
# "types itself" while you screen-record it in OBS (no live performance needed).
#   bash demo/play-terminal.sh            # natural speed
#   SPEED=2 bash demo/play-terminal.sh    # 2x faster
cd "$(dirname "$0")/recordings" || exit 2
div="${SPEED:-1}"
echo "Replaying terminal beats (speed ${div}x). Screen-record this window; Ctrl-C to stop."
sleep 1
exec scriptreplay --timing=terminal-beats.timing --divisor="$div" terminal-beats.rec
