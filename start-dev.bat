@echo off
set "PATH=C:\Users\Himanshu Singh\.cargo\bin;C:\msys64\ucrt64\bin;%PATH%"
set "CARGO_TARGET_DIR=C:\Users\Himanshu Singh\AppData\Local\Temp\cargo-target-cleanscope"

echo Starting CleanScope Desktop Application in Dev Mode...
npm run tauri dev
