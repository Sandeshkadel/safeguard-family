# SafeGuard Family - Complete Setup & Testing PowerShell Script
# Run: powershell -ExecutionPolicy Bypass -File setup.ps1

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "SafeGuard Family - Complete System Setup & Verification" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan

# STEP 1: Check Python Installation
Write-Host "`n[STEP 1/7] Checking Python Installation..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK - Python found: $pythonVersion" -ForegroundColor Green
}
else {
    Write-Host "ERROR: Python not found or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python 3.8+ from https://python.org" -ForegroundColor Red
    Exit 1
}

# STEP 2: Check Working Directory
Write-Host "`n[STEP 2/7] Checking Working Directory..." -ForegroundColor Yellow
$currentPath = Get-Location
Write-Host "Current directory: $currentPath" -ForegroundColor Cyan
if (Test-Path "backend_final.py") {
    Write-Host "OK - Found backend_final.py" -ForegroundColor Green
}
else {
    Write-Host "ERROR: backend_final.py not found!" -ForegroundColor Red
    Exit 1
}

# STEP 3: Install Dependencies
Write-Host "`n[STEP 3/7] Installing Python Dependencies..." -ForegroundColor Yellow
Write-Host "This may take 2-5 minutes..." -ForegroundColor Cyan
if (Test-Path "requirements_enhanced.txt") {
    pip install -r requirements_enhanced.txt -q
    Write-Host "OK - Dependencies installed successfully" -ForegroundColor Green
}
else {
    Write-Host "ERROR: requirements_enhanced.txt not found" -ForegroundColor Red
    Exit 1
}

# STEP 4: Verify .env File
Write-Host "`n[STEP 4/7] Checking Configuration File (.env)..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "OK - .env file found" -ForegroundColor Green
    $envContent = Get-Content ".env"
    $hasDatabase = $envContent -match "DATABASE_URL"
    $hasJwtSecret = $envContent -match "JWT_SECRET"
    $hasGroqKey = $envContent -match "GROQ_API_KEY"
    $hasApiKey = $envContent -match "API_KEY"
    
    if ($hasDatabase -and $hasJwtSecret -and $hasGroqKey -and $hasApiKey) {
        Write-Host "OK - All required environment variables found" -ForegroundColor Green
    }
    else {
        Write-Host "WARNING: Missing some environment variables in .env" -ForegroundColor Yellow
        Write-Host "    Required: DATABASE_URL, JWT_SECRET, GROQ_API_KEY, API_KEY" -ForegroundColor Yellow
    }
}
else {
    Write-Host "ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "`nPlease create .env with:" -ForegroundColor Yellow
    Write-Host "    DATABASE_URL=sqlite:///./video_downloader.db" -ForegroundColor Cyan
    Write-Host "    JWT_SECRET=your-secret-key-here" -ForegroundColor Cyan
    Write-Host "    GROQ_API_KEY=your-groq-api-key-here" -ForegroundColor Cyan
    Write-Host "    API_KEY=60113a172a6391a21af8032938e8febd" -ForegroundColor Cyan
    Exit 1
}

# STEP 5: Check Extension Files
Write-Host "`n[STEP 5/7] Checking Chrome Extension Files..." -ForegroundColor Yellow
$extensionFiles = @(
    "chrome-extension\auth.html",
    "chrome-extension\background_auth.js",
    "chrome-extension\dashboard_enhanced.html",
    "chrome-extension\config_extended.js",
    "chrome-extension\manifest.json"
)

$allFilesPresent = $true
foreach ($file in $extensionFiles) {
    if (Test-Path $file) {
        Write-Host "OK - $file" -ForegroundColor Green
    }
    else {
        Write-Host "MISSING - $file" -ForegroundColor Red
        $allFilesPresent = $false
    }
}

if (-not $allFilesPresent) {
    Write-Host "`nWARNING: Some extension files are missing!" -ForegroundColor Yellow
}

# STEP 6: Test Python Packages
Write-Host "`n[STEP 6/7] Verifying Python Packages..." -ForegroundColor Yellow
$packages = @("fastapi", "sqlalchemy", "groq", "jwt", "yt_dlp", "uvicorn", "pydantic")
foreach ($pkg in $packages) {
    $output = python -c "import $pkg" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK - $pkg" -ForegroundColor Green
    }
    else {
        Write-Host "MISSING - $pkg" -ForegroundColor Red
    }
}

# STEP 7: Display Summary
Write-Host "`n[STEP 7/7] Setup Summary..." -ForegroundColor Yellow
Write-Host "`nSetup completed! Ready to start the backend server." -ForegroundColor Green
Write-Host "`nTo start the backend:" -ForegroundColor Cyan
Write-Host "    python backend_final.py" -ForegroundColor White

Write-Host "`nBackend will run on:" -ForegroundColor Cyan
Write-Host "    http://localhost:8000" -ForegroundColor White

Write-Host "`nExtension Setup:" -ForegroundColor Cyan
Write-Host "    1. Go to chrome://extensions" -ForegroundColor Cyan
Write-Host "    2. Enable 'Developer mode'" -ForegroundColor Cyan
Write-Host "    3. Click 'Load unpacked'" -ForegroundColor Cyan
Write-Host "    4. Select 'chrome-extension' folder" -ForegroundColor Cyan

Write-Host "`n=====================================================================" -ForegroundColor Cyan
Write-Host "Ready to start SafeGuard Backend!" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Cyan

Read-Host "`nPress Enter to start backend (or Ctrl+C to cancel)"

Write-Host "`nStarting SafeGuard Backend Server..." -ForegroundColor Cyan
Write-Host "Listening on http://127.0.0.1:8000`n" -ForegroundColor Green

python backend_final.py
