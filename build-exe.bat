@echo off
set "PATH=C:\Users\Himanshu Singh\.cargo\bin;C:\msys64\ucrt64\bin;%PATH%"
set "CARGO_TARGET_DIR=C:\Users\Himanshu Singh\AppData\Local\Temp\cargo-target-cleanscope"

echo Building CleanScope Standalone Windows Release (.exe)...
npm run tauri build

echo.
echo Build complete! Release binaries:
echo Portable: %CARGO_TARGET_DIR%\release\cleanscope.exe
echo Installer: %CARGO_TARGET_DIR%\release\bundle\nsis\
pause
