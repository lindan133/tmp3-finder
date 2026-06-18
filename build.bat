@echo off
cd /d "%~dp0"

echo Сборка Finder...
call npm run dist
if errorlevel 1 exit /b 1

echo.
echo Готово. Файлы в папке release\
dir /b release\*.exe 2>nul
pause
