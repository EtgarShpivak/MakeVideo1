@echo off
echo ======================================================
echo   Bar Mitzvah Time-Lapse Video Generator
echo ======================================================
echo.
echo This will start both the Express server and the Vite development server.
echo.
echo Express server will run on: http://localhost:4000
echo Vite development server will run on: http://localhost:3000
echo.
echo IMPORTANT NOTES:
echo 1. Press Ctrl+C twice to stop each server when finished
echo 2. You will need a FAL.ai API key to generate videos
echo 3. If you experience connection errors, try using a VPN
echo.
echo Starting servers...
echo.

start cmd /k "title Express Server && color 0A && npm run server"
start cmd /k "title Vite Development Server && color 0B && npm run dev"

echo.
echo Servers started! Opening application in your browser...
echo.
timeout /t 5
start http://localhost:3000 
