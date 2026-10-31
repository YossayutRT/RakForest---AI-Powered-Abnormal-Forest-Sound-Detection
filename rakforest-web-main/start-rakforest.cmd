@echo off
setlocal
title RakForest - Local Web Server
cd /d "%~dp0"
rem Explorer does not inherit the Node.js PATH configured inside Codex.
set "RAKFOREST_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
if exist "%RAKFOREST_NODE%\node.exe" set "PATH=%RAKFOREST_NODE%;%PATH%"
where node >nul 2>nul
if errorlevel 1 goto missing_node
if not exist "node_modules\next\dist\bin\next" goto missing_dependencies
echo.
echo Starting RakForest...
echo Keep this window open while using the website.
echo Open the Local URL printed below in your browser.
echo Usually: http://127.0.0.1:3000/login
echo.
node node_modules\next\dist\bin\next dev --webpack --hostname 127.0.0.1
set "RAKFOREST_EXIT=%ERRORLEVEL%"
echo.
echo RakForest server stopped. Exit code: %RAKFOREST_EXIT%
pause
exit /b %RAKFOREST_EXIT%

:missing_node
echo Node.js was not found. Install Node.js 20.9 or newer and try again.
pause
exit /b 1

:missing_dependencies
echo Dependencies are missing. Run pnpm install in this folder first.
pause
exit /b 1
