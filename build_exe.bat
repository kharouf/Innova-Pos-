@echo off
title INNOVA POS PRO - Create Desktop Executable (.exe)
echo ====================================================================
echo             INNOVA POS PRO - WINDOWS DESKTOP COMPILER
echo ====================================================================
echo.
echo Ce script va installer automatiquement les dependances necessaires
echo et compiler l'application en un fichier executable autonome (.exe).
echo.
echo Requis : Node.js doit etre installe sur votre ordinateur.
echo S'il n'est pas installe, telechargez-le sur (https://nodejs.org).
echo.
echo ====================================================================
echo.

:: Check Node.js existence
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas installe !
    echo Veuillez telecharger et installer Node.js (Version LTS) sur :
    echo https://nodejs.org
    echo.
    echo Appuyez sur une touche pour quitter...
    pause >nul
    exit
)

echo [1/4] Installation des modules et dependances NPM...
echo (Veuillez patienter, cela peut prendre entre 30 et 60 secondes...)
call npm install --no-audit

if %errorlevel% neq 0 (
    echo [ERREUR] Echec lors de l'installation des dependances NPM !
    pause
    exit
)

echo.
echo [2/4] Compilation des bundles Vite et du serveur Express...
call npm run build

if %errorlevel% neq 0 (
    echo [ERREUR] Impossible de compiler l'application !
    pause
    exit
)

echo.
echo [3/4] Creation de l'application Windows (.exe Portable)...
echo (Veuillez patienter pendant le packaging Electron...)
call npm run electron:package

if %errorlevel% neq 0 (
    echo [ERREUR] Echec du packaging Electron en .exe !
    pause
    exit
)

echo.
echo ====================================================================
echo             🎉 COMPILATION REUSSIE AVEC SUCCES ! 🎉
echo ====================================================================
echo.
echo Votre application de caisse est prete ! L'executable (.exe) est disponible dans :
echo -- Dossier exporte: .\dist-desktop\INNOVA-POS-PRO-1.0.0-Portable.exe
echo.
echo Vous pouvez deplacer cet executable ou vous voulez (sur le Bureau,
echo une cle USB, etc.) et double-cliquer dessus pour lancer l'application.
echo.
echo Appuyez sur une touche pour ouvrir le dossier de destination...
explorer dist-desktop
pause
