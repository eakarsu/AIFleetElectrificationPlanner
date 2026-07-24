#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ -f "$root/.env" ]] || { echo 'Missing .env; copy .env.example and configure it.' >&2; exit 1; }
[[ -d "$root/backend/node_modules" && -d "$root/frontend/node_modules" ]] || { echo 'Dependencies missing; run scripts/bootstrap.sh.' >&2; exit 1; }
set -a
# shellcheck disable=SC1091
source "$root/.env"
set +a
api_port="${BACKEND_PORT:-${SERVER_PORT:-${PORT:-4000}}}"
ui_port="${FRONTEND_PORT:-${CLIENT_PORT:-3000}}"
[[ "$api_port" != "$ui_port" ]] || { echo "Backend and frontend ports must be distinct." >&2; exit 1; }
for port in "$api_port" "$ui_port"; do ! lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 || { echo "Port $port is already in use; refusing to terminate its owner." >&2; exit 1; }; done
if [[ "${ALLOW_SCHEMA_MIGRATION:-false}" == "true" ]]; then
  "$root/scripts/migrate.sh"
  (cd "$root/backend" && node src/create-admin.js)
fi
cleanup(){ kill "${backend_pid:-}" "${frontend_pid:-}" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
(cd "$root/backend" && BACKEND_PORT="$api_port" npm start) & backend_pid=$!
(cd "$root/frontend" && BROWSER=none HOST="${HOST:-127.0.0.1}" PORT="$ui_port" REACT_APP_API_ORIGIN="http://127.0.0.1:$api_port" REACT_APP_API_URL="http://127.0.0.1:$api_port/api" npm start) & frontend_pid=$!
wait "$backend_pid" "$frontend_pid"
