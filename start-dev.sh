#!/usr/bin/env bash
# JedzTo — full local dev stack starter (API + Metro + tunnel).
#
# Starts, in order:
#   1. jedzto-local-api        -> http://localhost:8001  (GraphQL + WS)
#   2. dev-tunnel-proxy.js     -> http://localhost:8090  (routes /graphql,/health,/playground
#                                 to the API, everything else to Metro)
#   3. ngrok http 8090         -> public https://<subdomain>.ngrok-free.dev
#   4. Expo Metro bundler      -> http://localhost:8081  (started with
#                                 EXPO_OFFLINE=1 + EXPO_PACKAGER_PROXY_URL so the
#                                 manifest advertises the tunnel URL correctly and
#                                 skips the EAS code-signing login requirement)
#
# IMPORTANT: this script stays in the FOREGROUND (blocks on `wait` at the end)
# so all four child processes keep running as long as the script runs. Stop
# everything with Ctrl+C (or close the terminal). If you need it fully
# detached in the background, run: nohup ./start-dev.sh > /tmp/jedzto-logs/stack.log 2>&1 &
#
# Usage:
#   ./start-dev.sh
#
# Requires: node on PATH (or set NODE_BIN below), and a configured ngrok
# authtoken (ngrok config file already has one saved on this machine).
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$ROOT_DIR/enatega-multivendor-app"
API_DIR="$ROOT_DIR/jedzto-local-api"
LOG_DIR="/tmp/jedzto-logs"
mkdir -p "$LOG_DIR"

# Adjust if your Node/ngrok installs live elsewhere.
NODE_BIN="${NODE_BIN:-/Users/szymonkotula/.local/nodejs/bin}"
NGROK_BIN="${NGROK_BIN:-$HOME/.local/ngrok}"
export PATH="$NODE_BIN:$NGROK_BIN:$PATH"

PIDS=()
cleanup() {
  echo ""
  echo "==> Stopping stack..."
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
  exit 0
}
trap cleanup INT TERM

echo "==> Stopping any previous instances..."
pkill -f 'jedzto-local-api/server.js' 2>/dev/null || true
pkill -f 'node dev-tunnel-proxy.js' 2>/dev/null || true
pkill -f 'ngrok http' 2>/dev/null || true
pkill -f 'expo start' 2>/dev/null || true
lsof -ti :8001 -sTCP:LISTEN 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti :8081 -sTCP:LISTEN 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti :8090 -sTCP:LISTEN 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1

echo "==> Starting API (port 8001)..."
(cd "$API_DIR" && exec node server.js) > "$LOG_DIR/api.log" 2>&1 &
PIDS+=($!)
sleep 3

echo "==> Starting combined dev-tunnel proxy (port 8090)..."
(cd "$ROOT_DIR" && exec node dev-tunnel-proxy.js) > "$LOG_DIR/proxy.log" 2>&1 &
PIDS+=($!)
sleep 1

echo "==> Starting ngrok tunnel for port 8090..."
ngrok http 8090 --log=stdout --log-format=logfmt > "$LOG_DIR/ngrok.log" 2>&1 &
PIDS+=($!)
sleep 4

TUNNEL_URL=$(curl -s http://localhost:4040/api/tunnels | node -e '
  const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
  const t = (data.tunnels || []).find(t => t.proto === "https") || data.tunnels?.[0];
  if (t) console.log(t.public_url);
')

if [ -z "$TUNNEL_URL" ]; then
  echo "!! Could not read ngrok tunnel URL. Check $LOG_DIR/ngrok.log"
  cleanup
  exit 1
fi
echo "==> Tunnel URL: $TUNNEL_URL"

echo "==> Starting Expo Metro bundler (offline mode, proxy-aware)..."
(cd "$APP_DIR" && exec env EXPO_OFFLINE=1 EXPO_PACKAGER_PROXY_URL="$TUNNEL_URL" npx expo start --clear) > "$LOG_DIR/expo.log" 2>&1 &
PIDS+=($!)
sleep 6

EXP_URL="${TUNNEL_URL/https:/exp:}"
echo "==> Generating QR code..."
mkdir -p "$APP_DIR/.tmp"
python3 -c "
import qrcode
img = qrcode.make('$EXP_URL')
img.save('$APP_DIR/.tmp/expo-qr.png')
" 2>/dev/null || echo "(qrcode python lib not available — open the URL manually in Expo Go)"

echo ""
echo "================================================================"
echo " JedzTo dev stack is up:"
echo "   API (direct):     http://localhost:8001/graphql"
echo "   Metro (direct):   http://localhost:8081"
echo "   Combined tunnel:  $TUNNEL_URL   (serves both API + Metro)"
echo "   Expo Go link:     $EXP_URL"
echo "   QR code:          $APP_DIR/.tmp/expo-qr.png"
echo ""
echo " Logs: $LOG_DIR/{api,proxy,ngrok,expo}.log"
echo " Press Ctrl+C to stop everything."
echo "================================================================"

wait
