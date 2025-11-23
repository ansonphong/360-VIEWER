#!/bin/bash

# Phong 360 Viewer - Library Builder (macOS)
# Double-click this file to build your 360 image library

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to library directory
cd "$SCRIPT_DIR/library"

echo "========================================"
echo "Phong 360 Viewer - Library Builder"
echo "========================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed"
    echo "Please install Python 3 from python.org"
    echo ""
    read -p "Press any key to exit..."
    exit 1
fi

# Check if required packages are installed
echo "Checking dependencies..."
python3 -c "import PIL; import tqdm" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "📦 Installing required packages (Pillow and tqdm)..."
    pip3 install Pillow tqdm
    echo ""
    
    # Verify installation
    python3 -c "import PIL; import tqdm" 2>/dev/null
    if [ $? -ne 0 ]; then
        echo "❌ Error: Failed to install dependencies"
        echo "Please try manually: pip3 install Pillow tqdm"
        echo ""
        read -p "Press any key to exit..."
        exit 1
    fi
    echo "✅ Dependencies installed successfully"
    echo ""
fi

# Run the library builder
echo "Building library..."
echo ""
python3 build_library.py

# Check if successful
if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "✅ Library build complete!"
    echo "========================================"
    echo ""
    echo "Generated files:"
    echo "  - library.json (v2.0 format)"
    echo "  - _BUILD/ folder with thumbnails and quality versions"
    echo ""
else
    echo ""
    echo "========================================"
    echo "❌ Error building library"
    echo "========================================"
    echo ""
fi

# Keep terminal open to see results
echo "Press any key to close..."
read -n 1 -s

