#!/usr/bin/env bash
# Watches the ngrok tunnel (started by start-dev.sh, exposing dev-tunnel-proxy
# on :8090) and restarts ONLY the ngrok agent if its session drops for too
# long. Does not touch the API, Metro, or the proxy. Since this ngrok account
# has a reserved static domain, restarting the agent keeps the same public
# URL — the already-scanned Expo QR code / exp:// link keeps working.
#
# Usage:
#   ./ngrok-watchdog.sh &          (leave running alongside start-dev.sh)
#   nohup ./ngrok-watchdog.sh > /tmp/jedzto-logs/ngrok-watchdog.log 2>&1 &
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="/tmp/jedzto-logs"
mkdir -p "$LOG_DIR"

NODE_BIN="${NODE_BIN:-/Users/szymonkotula/.local/nodejs/bin}"
NGROK_BIN="${NGROK_BIN:-$HOME/.local/ngrok}"
export PATH="$NODE_BIN:$NGROK_BIN:$PATH"

PROXY_PORT="${PROXY_PORT:-8090}"
NGROK_API="http://localhost:4040/api/tunnels"
CHECK_INTERVAL_S=10
DOWN_THRESHOLD_S=25   # restart only after this many consecutive seconds down

down_since=0

is_tunnel_up() {
  curl -s --max-time 5 "$NGROK_API" 2>/dev/null | grep -q '"public_url"'
}

start_ngrok() {
  echo "[$(date '+%H:%M:%S')] (re)starting ngrok http $PROXY_PORT ..."
  pkill -f "ngrok http $PROXY_PORT" 2>/dev/null || true
  sleep 1
  (cd "$ROOT_DIR" && exec ngrok http "$PROXY_PORT" --log=stdout --log-format=logfmt) \
    > "$LOG_DIR/ngrok.log" 2>&1 &
  echo "[$(date '+%H:%M:%S')] ngrok (re)started, pid=$!"
}

echo "[$(date '+%H:%M:%S')] ngrok watchdog started (checking every ${CHECK_INTERVAL_S}s, restart after ${DOWN_THRESHOLD_S}s down)"

while true; do
  if is_tunnel_up; then
    if [ "$down_since" -ne 0 ]; then
      echo "[$(date '+%H:%M:%S')] tunnel back up"
    fi
    down_since=0
  else
    if [ "$down_since" -eq 0 ]; then
      down_since=$(date +%s)
      echo "[$(date '+%H:%M:%S')] tunnel appears down, watching..."
    fi
    now=$(date +%s)
    elapsed=$((now - down_since))
    if [ "$elapsed" -ge "$DOWN_THRESHOLD_S" ]; then
      echo "[$(date '+%H:%M:%S')] tunnel down for ${elapsed}s — restarting ngrok agent"
      start_ngrok
      down_since=0
      sleep 5
    fi
  fi
  sleep "$CHECK_INTERVAL_S"
done
