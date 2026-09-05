@echo off
chcp 65001 >nul
title Swara.ai - Sovereign Model Downloader
cd /d "%~dp0"

echo ======================================================================
echo   Swara.ai - Sovereign Model Downloader
echo   Automated Environment Setup and Model Retrieval
echo ======================================================================
echo.

REM 1. Check or Create Virtual Environment
if not exist "venv\Scripts\python.exe" (
    echo [1/3] Virtual environment not found. Creating venv...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment. Ensure Python 3.10+ is installed on PATH.
        pause
        exit /b 1
    )
    echo [1/3] Virtual environment created successfully.
) else (
    echo [1/3] Virtual environment found [venv].
)

REM 2. Install / Verify Dependencies
echo.
echo [2/3] Checking and installing requirements from requirements.txt...
venv\Scripts\python.exe -m pip install --upgrade pip --quiet
venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 (
    echo [WARNING] Some packages had warnings during install. Proceeding to model download...
)

REM 3. Download Models
echo.
echo [3/3] Downloading sovereign models: Qwen3 1.7B, Qwen2.5-VL 3B + mmproj, Qwen3 0.6B...
venv\Scripts\python.exe scripts\download_models.py
if errorlevel 1 (
    echo.
    echo [WARNING] Download encountered an interruption. You can run download_models.bat again to resume anytime.
) else (
    echo.
    echo [SUCCESS] All sovereign models downloaded and ready!
)

echo.
echo ======================================================================
echo   Setup finished. You can now launch Swara.ai with run.bat
echo ======================================================================
echo.
pause
