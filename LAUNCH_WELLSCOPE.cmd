@echo off
setlocal
set "INDEX=%~dp0app\index.html"
if not exist "%INDEX%" (
 echo ERROR: app\index.html not found. Extract the complete ZIP before launching.
 pause
 exit /b 1
)
start "" "%INDEX%"
