@echo off
title KorailTicketAgent Launcher
cd /d "%~dp0"
if exist "dist\win-unpacked\KorailTicketAgent.exe" (
    start "" "dist\win-unpacked\KorailTicketAgent.exe"
) else (
    npx electron .
)
