@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
set "REPO=https://github.com/MrGesier/Wellscope---Engineering.git"
echo.
echo WellScope Engineering Alpha 0.3 - import dans %REPO%
echo IMPORTANT : le depot cible est actuellement PUBLIC. Le pack contient uniquement le prototype original, des cas synthetiques et ses captures.
echo Aucun PDF prive, fichier BPL, DLL ou executable tiers DrillScan n'est inclus.
echo.
choice /C ON /M "Continuer avec la publication sur ce depot public ?"
if errorlevel 2 exit /b 1
where git >nul 2>nul
if errorlevel 1 (
  echo ERREUR : Git for Windows n'est pas installe. Installer https://git-scm.com/downloads/win puis relancer.
  pause
  exit /b 1
)
if not exist ".git" git init
if errorlevel 1 goto :fail
git branch -M main
if errorlevel 1 goto :fail
git add -A
if errorlevel 1 goto :fail
git diff --cached --quiet
if errorlevel 1 (
  git -c user.name="MrGesier" -c user.email="33580568+MrGesier@users.noreply.github.com" commit -m "Initial import: WellScope Engineering Alpha 0.3"
  if errorlevel 1 goto :fail
)
git remote get-url origin >nul 2>nul
if errorlevel 1 (
  git remote add origin "%REPO%"
) else (
  git remote set-url origin "%REPO%"
)
if errorlevel 1 goto :fail
git push -u origin main
if errorlevel 1 goto :fail
echo.
echo PUSHE AVEC SUCCES : https://github.com/MrGesier/Wellscope---Engineering
pause
exit /b 0
:fail
echo.
echo ECHEC : Le push n'a pas ete confirme. Copier le message d'erreur ci-dessus pour diagnostic.
pause
exit /b 1
