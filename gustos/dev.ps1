# Pornește serverul Gustos în modul dezvoltare, pe http://localhost:8099
# Rulare din folderul proiectului:  .\dev.ps1
$env:GUSTOS_DATA_DIR = Join-Path $PSScriptRoot "dev-data"
Set-Location (Join-Path $PSScriptRoot "backend")
& .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8099 --reload --reload-dir app
