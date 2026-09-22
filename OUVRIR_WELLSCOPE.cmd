@echo off
setlocal
set "INDEX=%~dp0app\index.html"
if not exist "%INDEX%" (
 echo ERREUR : app\index.html introuvable. Decompressez le ZIP complet avant ouverture.
 pause
 exit /b 1
)
start "" "%INDEX%"
