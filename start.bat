@echo off
echo 启动五子棋对战系统...
echo.

start cmd /k "cd backend && npm install && npm run dev"
timeout /t 3 /nobreak >nul
start cmd /k "cd frontend && npm install && npm run dev"

echo.
echo 系统启动中...
echo 后端服务: http://localhost:3001
echo 前端访问: http://localhost:3000
echo.
pause