@echo off
cd /d "%~dp0"

if exist "release\TMP3-Finder-Portable.exe" (
  start "" "release\TMP3-Finder-Portable.exe"
  exit /b 0
)

if exist "release\TMP3-Answer-Finder.exe" (
  start "" "release\TMP3-Answer-Finder.exe"
  exit /b 0
)

where npm >nul 2>nul
if errorlevel 1 (
  echo Соберите приложение: build.bat
  echo Или установите Node.js для режима разработки.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Установка зависимостей...
  call npm install
)

echo Запуск в режиме разработки...
call npm run dev
