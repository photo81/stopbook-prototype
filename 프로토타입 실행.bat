@echo off
rem Stopbook prototype - opens the project at http://localhost:8090 (needed for Kakao postcode search)
rem Close this window to stop the server.
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
