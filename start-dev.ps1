# CleanScope Development Launcher
$env:PATH = "C:\Users\Himanshu Singh\.cargo\bin;C:\msys64\ucrt64\bin;$env:PATH"
$env:CARGO_TARGET_DIR = "C:\Users\Himanshu Singh\AppData\Local\Temp\cargo-target-cleanscope"

Write-Host "Starting CleanScope Development Server..." -ForegroundColor Cyan
npm run tauri dev
