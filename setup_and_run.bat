@echo off
REM SafeGuard Family - Complete Setup & Verification Script
REM Run this to set up and test everything

echo.
echo ================================================
echo  SafeGuard Family - Full Setup & Verification
echo ================================================
echo.

REM Step 1: Check Python Installation
echo [1/7] Checking Python Installation...
python --version
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)
echo OK - Python found
echo.

REM Step 2: Install Dependencies
echo [2/7] Installing Python Dependencies...
pip install -r requirements_enhanced.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo OK - Dependencies installed
echo.

REM Step 3: Check .env file
echo [3/7] Checking .env Configuration File...
if not exist .env (
    echo ERROR: .env file not found!
    echo Please create .env file with:
    echo   DATABASE_URL=sqlite:///./video_downloader.db
    echo   JWT_SECRET=your-secret-key-here
    echo   GROQ_API_KEY=your-groq-api-key-here
    echo   API_KEY=60113a172a6391a21af8032938e8febd
    echo.
    pause
    exit /b 1
)
echo OK - .env file found
echo.

REM Step 4: Test database connection
echo [4/7] Initializing Database...
python -c "from backend_enhanced import db, app; print('✓ Database connection successful')"
if errorlevel 1 (
    echo WARNING: Database initialization may have issues
)
echo.

REM Step 5: Display API endpoints
echo [5/7] Available Endpoints:
echo   POST      /api/auth/register          - Create parent account
echo   POST      /api/auth/login             - Parent login
echo   POST      /api/auth/logout            - Parent logout
echo   POST      /api/children               - Add child device
echo   GET       /api/children               - List children
echo   DELETE    /api/children/{child_id}    - Remove child
echo   POST      /api/videos/analyze         - Analyze video
echo   GET       /api/reports/weekly/{id}    - Weekly report
echo   GET       /api/reports/all/{id}       - All reports
echo   GET       /health                     - Health check
echo.

REM Step 6: Display next steps
echo [6/7] Next Steps:
echo   1. Start backend: python backend_enhanced.py
echo   2. Open chrome://extensions
echo   3. Enable "Developer Mode"
echo   4. Load unpacked folder: chrome-extension
echo   5. Click extension icon to open auth.html
echo.

REM Step 7: Ready to run
echo [7/7] Setup Complete!
echo.
echo ================================================
echo  Starting SafeGuard Backend Server...
echo ================================================
echo.

python backend_enhanced.py

pause
