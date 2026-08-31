# CleanScope Standalone EXE Release Builder
$env:PATH = "C:\Users\Himanshu Singh\.cargo\bin;C:\msys64\ucrt64\bin;$env:PATH"
$env:CARGO_TARGET_DIR = "C:\Users\Himanshu Singh\AppData\Local\Temp\cargo-target-cleanscope"

Write-Host "Building CleanScope Standalone Windows Release (.exe)..." -ForegroundColor Cyan
npm run tauri build

Write-Host "`nBuild complete! Your release files are located at:" -ForegroundColor Green
Write-Host "1. Portable EXE: $env:CARGO_TARGET_DIR\release\cleanscope.exe" -ForegroundColor Yellow
Write-Host "2. Installer (NSIS): $env:CARGO_TARGET_DIR\release\bundle\nsis\" -ForegroundColor Yellow
