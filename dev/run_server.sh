#!/bin/bash
# Simple development server for Phong 360 Viewer
# Run from the dev folder or project root

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Go to project root (one level up from dev folder)
cd "$SCRIPT_DIR/.."

echo "🌐 Starting Phong 360 Viewer development server..."
echo "📂 Serving from: $(pwd)"
echo "🔗 Open: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start Python HTTP server
python3 -m http.server 8000

