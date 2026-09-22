@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
where git >nul 2>nul
if errorlevel 1 (
  echo ERREUR: Git n'est pas installe. Installer Git for Windows puis relancer.
  pause
  exit /b 1
)
echo Cree d'abord un nouveau depot GitHub VIDE et PRIVE sur https://github.com/new
set /p "REPO=Colle ici son URL HTTPS ou SSH (ex: https://github.com/TON_COMPTE/WellScope-Engineering.git) : "
if "%REPO%"=="" (
  echo URL de depot manquante.
  pause
  exit /b 1
)
if not exist ".git" git init
if errorlevel 1 goto :fail
git branch -M main
if errorlevel 1 goto :fail
git add .
if errorlevel 1 goto :fail
git diff --cached --quiet
if errorlevel 1 (
  git -c user.name="WellScope Contributor" -c user.email="wellscope-local@users.noreply.github.com" commit -m "Initial import: WellScope Engineering Alpha 0.3"
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
echo Push termine. Ouvre ton depot GitHub pour verifier les fichiers.
pause
exit /b 0
:fail
echo.
echo Echec. Lis le message Git affiche ci-dessus et relance apres correction.
pause
exit /b 1
