@echo off
setlocal
pushd "%~dp0"
if errorlevel 1 exit /b 1
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is missing. Install Node.js 22.19+ ^(22.x^), 24.11+ ^(24.x^), or 26+ from https://nodejs.org/
  popd
  pause
  exit /b 1
)
node scripts/run-local.mjs %*
set "RESULT=%ERRORLEVEL%"
popd
if "%~1"=="" pause
exit /b %RESULT%
