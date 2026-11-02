@echo off
setlocal
cd /d "%~dp0"
echo ================================================
echo  SHAKEEL NETWORKING - ATLAS PORTABLE BUILDER
echo ================================================
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js LTS is required. Install it from https://nodejs.org/ then rerun.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing build dependencies...
  call npm install
  if errorlevel 1 goto fail
)
echo Checking source files...
call npm run check
if errorlevel 1 goto fail
echo Building Windows unpacked and portable editions...
call npm run build:win
if errorlevel 1 goto fail
echo.
echo Build complete. See the release folder.
echo For USB transfer, copy the portable EXE and its DATA folder together (JSON + TXT).
pause
exit /b 0
:fail
echo Build failed. Read the error above.
pause
exit /b 1
