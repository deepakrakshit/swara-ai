# Launch Swara.ai Sovereign Workbench
Set-Location -Path $PSScriptRoot
if (Test-Path "venv\Scripts\python.exe") {
    & ".\venv\Scripts\python.exe" run.py
} else {
    python run.py
}
