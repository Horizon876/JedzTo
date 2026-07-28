@echo off
setlocal
cd /d "%~dp0"
title JedzTo Launcher
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-jedzto.ps1"
if errorlevel 1 (
  echo.
  echo Blad launchera. Okno zostanie otwarte 15s...
  timeout /t 15 >nul
)
endlocal
