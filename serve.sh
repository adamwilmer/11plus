#!/bin/bash
# Simple HTTP server for local testing
# This starts a web server on http://localhost:8000

PORT=${1:-8000}

echo "Starting local server on http://localhost:$PORT"
echo "Press Ctrl+C to stop"
echo ""

python3 -m http.server $PORT
