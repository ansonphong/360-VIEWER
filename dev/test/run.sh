#!/usr/bin/env bash
# dev/test/run.sh — Minimal test runner for 360 Viewer
#
# Usage:  bash dev/test/run.sh <test-name>
#         bash dev/test/run.sh all
#
# Test files are in dev/test/ named test-<name>.js.
# Each test file is a Node.js script that uses assert for checks
# and exits non-zero on failure.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VIEWER_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

run_one() {
	local test_name="$1"
	local test_file="$SCRIPT_DIR/test-${test_name}.js"

	if [[ ! -f "$test_file" ]]; then
		echo "ERROR: test file not found: $test_file"
		exit 1
	fi

	echo "=== Running: test-${test_name}.js ==="
	cd "$VIEWER_ROOT"
	node "$test_file"
	echo "=== PASS: test-${test_name}.js ==="
	echo ""
}

TEST_NAME="${1:-all}"

if [[ "$TEST_NAME" == "all" ]]; then
	shopt -s nullglob
	found=0
	for f in "$SCRIPT_DIR"/test-*.js; do
		base="$(basename "$f" .js)"
		# strip test- prefix
		name="${base#test-}"
		run_one "$name"
		found=1
	done
	if [[ $found -eq 0 ]]; then
		echo "No test files found in $SCRIPT_DIR"
	fi
	echo "All tests passed."
else
	run_one "$TEST_NAME"
fi
