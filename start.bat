@echo off
chcp 65001 >nul 2>&1
title Music Player - Starting...

echo ===================================================
echo         Music Player - Desktop Client
echo ===================================================
echo.

:: Kill processes on ports 3000 and 5173
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)

set NODE_EXE=C:\Program Files\nodejs\node.exe
set FRONTEND_DIR=%~dp0frontend
set BACKEND_DIR=%~dp0backend

echo [1/3] Starting backend server...
start /b "" "%NODE_EXE%" "%BACKEND_DIR%\server.js"
timeout /t 3 /nobreak >nul

echo [2/3] Starting Vite dev server...
start /b "" "%NODE_EXE%" "%FRONTEND_DIR%\node_modules\vite\bin\vite.js" --mode electron
timeout /t 5 /nobreak >nul

echo [3/3] Starting Electron...
start "" "%FRONTEND_DIR%\node_modules\electron\dist\electron.exe" "%FRONTEND_DIR%"

echo.
echo Music Player started! Close this window to stop all services.
echo ===================================================

:: Wait for Electron to close
:wait_loop
timeout /t 5 /nobreak >nul
:: Check if electron is still running
tasklist /FI "IMAGENAME eq electron.exe" 2>nul | find /I "electron.exe" >nul
if %ERRORLEVEL%==0 goto wait_loop

:: Cleanup: kill backend and vite
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)
