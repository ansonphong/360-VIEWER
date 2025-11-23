@echo off
REM Phong 360 Viewer - Library Builder (Windows)
REM Double-click this file to build your 360 image library

cd /d "%~dp0library"

echo ========================================
echo Phong 360 Viewer - Library Builder
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed
    echo Please install Python 3 from python.org
    echo.
    pause
    exit /b 1
)

REM Check if required packages are installed
echo Checking dependencies...
python -c "import PIL; import tqdm" >nul 2>&1
if errorlevel 1 (
    echo Installing required packages (Pillow and tqdm)...
    pip install Pillow tqdm
    echo.
    
    REM Verify installation
    python -c "import PIL; import tqdm" >nul 2>&1
    if errorlevel 1 (
        echo Error: Failed to install dependencies
        echo Please try manually: pip install Pillow tqdm
        echo.
        pause
        exit /b 1
    )
    echo Dependencies installed successfully
    echo.
)

REM Run the library builder
echo Building library...
echo.
python build_library.py

if errorlevel 1 (
    echo.
    echo ========================================
    echo Error building library
    echo ========================================
    echo.
) else (
    echo.
    echo ========================================
    echo Library build complete!
    echo ========================================
    echo.
    echo Generated files:
    echo   - library.json (v2.0 format)
    echo   - _BUILD/ folder with thumbnails and quality versions
    echo.
)

pause

