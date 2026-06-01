@echo off
title INNOVA POS PRO - Offline Local Server
echo ====================================================================
echo             INNOVA POS PRO - OFFLINE LOCAL RUNNER
echo ====================================================================
echo.
echo Ce script va initialiser et demarrer votre logiciel de caisse localement.
echo.
echo Requis : Node.js (https://nodejs.org) doit etre installe sur votre laptop.
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

echo [1/3] Verification et installation des modules de base...
call npm install --no-audit

if %errorlevel% neq 0 (
    echo [ERREUR] Impossible d'installer les modules. Verifiez votre connexion internet pour l'installation initiale.
    pause
    exit
)

echo.
echo [2/3] Compilation du systeme et du serveur local...
call npm run build

if %errorlevel% neq 0 (
    echo [ERREUR] Echec de la compilation du projet !
    pause
    exit
)

echo.
echo [3/3] Demarrage de l'application locale...
echo.
echo ====================================================================
echo    🚀 L'APPLICATION DEMARRE SUR VOTRE LAPTOP !
echo    👉 Connectez-vous sur votre navigateur a cette adresse :
echo.
echo            👉 http://localhost:3000
echo.
echo    (Gardez cette fenetre de terminal ouverte le temps d'utiliser le POS)
echo ====================================================================
echo.
start http://localhost:3000
call npm run start
pause
