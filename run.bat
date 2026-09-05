@echo off
chcp 65001 >nul
title Swara.ai - Sovereign Workbench
cd /d "%~dp0"

echo ======================================================================
echo   Swara.ai - Sovereign On-Premise AI Workbench
echo   MoPNG / MRPL (SIH26117)
echo ======================================================================
echo.

REM 1. Check or Create Virtual Environment
if not exist "venv\Scripts\python.exe" (
    if exist "..\Project-Kavach\venv\Scripts\python.exe" (
        echo [1/3] Detecting pre-configured sovereign venv...
        xcopy /E /I /Q /Y "..\Project-Kavach\venv" "venv" >nul
        echo [1/3] Reused pre-configured venv.
    ) else (
        echo [1/3] Virtual environment not found. Initializing venv...
        python -m venv venv
        if errorlevel 1 (
            echo [ERROR] Failed to create virtual environment. Ensure Python 3.10+ is on PATH.
            pause
            exit /b 1
        )
        echo [1/3] Virtual environment initialized.
        echo [2/3] Installing dependencies from requirements.txt...
        venv\Scripts\python.exe -m pip install -r requirements.txt --quiet
    )
) else (
    echo [1/3] Virtual environment detected [venv].
)

REM 2. Fast Dependency Check
echo [2/3] Verifying core sovereign dependencies...
venv\Scripts\python.exe -c "import fastapi, uvicorn, openpyxl, docx, httpx, langgraph, chromadb" 2>nul
if errorlevel 1 (
    echo [2/3] Installing missing dependencies...
    venv\Scripts\python.exe -m pip install -r requirements.txt --quiet
) else (
    echo [2/3] Dependencies verified.
)

REM 3. Ensure Environment and UI Distribution
if not exist ".env" (
    if exist "..\Project-Kavach\.env" (
        copy /y "..\Project-Kavach\.env" ".env" >nul
        echo [OK] Synced cluster configuration [.env].
    )
)

if not exist "dist\index.html" (
    if exist "..\Project-Kavach\dist\index.html" (
        xcopy /E /I /Q /Y "..\Project-Kavach\dist" "dist" >nul
        echo [OK] Prepared static Web UI [dist].
    )
)

REM 4. Launch System
echo.
echo [3/3] Starting Swara.ai Sovereign Engine...
venv\Scripts\python.exe run.py

if errorlevel 1 (
    echo.
    echo [NOTICE] Process exited with code %errorlevel%.
)
echo.
pause
