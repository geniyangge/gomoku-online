@echo off
echo Starting Gobang Server...
echo.

cd backend
start cmd /k "npm install && npm run dev"
cd ..

timeout /t 3 /nobreak >nul

cd frontend
start cmd /k "npm install && npm run dev"
cd ..

echo.
echo Servers started!
echo Backend: http://localhost:8090
echo Frontend: http://localhost:8091
echo.
pause