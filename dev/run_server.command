#!/bin/bash
# macOS executable script for starting development server
# Double-click to run

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Go to project root (one level up from dev folder)
cd "$SCRIPT_DIR/.."

# Open a new Terminal window and run the server
osascript -e 'tell application "Terminal" to do script "cd '"$SCRIPT_DIR/.."' && python3 -m http.server 8000"'

# Open browser after a short delay
sleep 2
open "http://localhost:8000"

