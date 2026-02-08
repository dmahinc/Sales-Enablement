#!/usr/bin/env bash
# Run the backend bound to all interfaces so it's reachable on the VM IP (e.g. http://91.134.72.199:8000)
cd "$(dirname "$0")"
if [[ -x ./venv/bin/python ]]; then
  exec ./venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port "${PORT:-8000}"
else
  exec python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port "${PORT:-8000}"
fi
