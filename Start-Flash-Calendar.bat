@echo off
cd /d "%~dp0"
set ELECTRON_RUN_AS_NODE=
echo Starting Flash Calendar ^& Routine Tasks...
start "" ".\node_modules\electron\dist\electron.exe" .
