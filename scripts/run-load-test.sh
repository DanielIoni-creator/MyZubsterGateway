#!/usr/bin/env bash
# Runner per i test di carico - Bounty P5 (#269)
#
# Avvia il gateway se non è già in ascolto, esegue lo scenario k6 (o Artillery
# con --tool artillery) e genera il report Markdown.
#
#   ./scripts/run-load-test.sh
#   ./scripts/run-load-test.sh --profile stress --peak-vus 200
#   ./scripts/run-load-test.sh --tool artillery
#   BASE_URL=https://gateway.example ./scripts/run-load-test.sh --no-start
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BASE_URL="${BASE_URL:-http://localhost:10000}"
PROFILE="load"
PEAK_VUS="${PEAK_VUS:-100}"
TOOL="k6"
START_SERVER=1
REPORT_DIR="reports/load"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile)   PROFILE="$2"; shift 2 ;;
    --peak-vus)  PEAK_VUS="$2"; shift 2 ;;
    --tool)      TOOL="$2"; shift 2 ;;
    --no-start)  START_SERVER=0; shift ;;
    -h|--help)
      sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) echo "Opzione sconosciuta: $1" >&2; exit 2 ;;
  esac
done

mkdir -p "$REPORT_DIR"

SERVER_PID=""
cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    echo "🛑 Arresto del gateway (pid $SERVER_PID)..."
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

gateway_up() {
  curl -sf --max-time 3 "$BASE_URL/health" >/dev/null 2>&1
}

if gateway_up; then
  echo "✅ Gateway già in ascolto su $BASE_URL"
  echo "⚠️  Il gateway ha un rate limiter globale (default 100 richieste / 15 min per IP)."
  echo "    Se non è stato avviato con RATE_LIMIT_MAX alto, il test misurerà il limiter"
  echo "    e non il gateway. Riavvialo con: RATE_LIMIT_MAX=10000000 npm start"
elif [[ "$START_SERVER" -eq 1 ]]; then
  echo "🚀 Avvio del gateway (rate limiter alzato per il test)..."
  # Il rate limiter globale (Bounty B15) blocca a 100 richieste per IP: un test
  # di carico da una singola macchina lo saturerebbe in un secondo e misurerebbe
  # il limiter invece del gateway. Qui lo alziamo solo per il processo di test.
  RATE_LIMIT_MAX="${RATE_LIMIT_MAX:-10000000}" \
  RATE_LIMIT_WINDOW="${RATE_LIMIT_WINDOW:-60}" \
    npm start >"$REPORT_DIR/server.log" 2>&1 &
  SERVER_PID=$!
  for _ in $(seq 1 30); do
    gateway_up && break
    sleep 1
  done
  if ! gateway_up; then
    echo "❌ Il gateway non risponde su $BASE_URL. Log: $REPORT_DIR/server.log" >&2
    exit 1
  fi
  echo "✅ Gateway pronto (pid $SERVER_PID)"
else
  echo "❌ Gateway non raggiungibile su $BASE_URL e --no-start è attivo." >&2
  exit 1
fi

case "$TOOL" in
  k6)
    if ! command -v k6 >/dev/null 2>&1; then
      echo "❌ k6 non installato. Vedi https://k6.io/docs/get-started/installation/" >&2
      echo "   In alternativa: ./scripts/run-load-test.sh --tool artillery" >&2
      exit 127
    fi
    echo "📈 k6 — profilo '$PROFILE', picco ${PEAK_VUS} VU, target $BASE_URL"
    BASE_URL="$BASE_URL" PROFILE="$PROFILE" PEAK_VUS="$PEAK_VUS" REPORT_DIR="$REPORT_DIR" \
      k6 run tests/load/k6/gateway-load.js
    node scripts/load-report.js "$REPORT_DIR/summary.json" -o "$REPORT_DIR/report.md"
    ;;
  artillery)
    ARTILLERY=(npx --yes artillery)
    command -v artillery >/dev/null 2>&1 && ARTILLERY=(artillery)
    echo "📈 Artillery — target $BASE_URL"
    "${ARTILLERY[@]}" run -t "$BASE_URL" \
      --output "$REPORT_DIR/artillery.json" \
      tests/load/artillery/gateway-load.yml
    node scripts/load-report.js "$REPORT_DIR/artillery.json" -o "$REPORT_DIR/report.md"
    ;;
  *)
    echo "❌ Tool sconosciuto: $TOOL (usa k6 o artillery)" >&2
    exit 2 ;;
esac

echo "📄 Report disponibile in $REPORT_DIR/report.md"
