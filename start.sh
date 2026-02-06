#!/bin/bash

echo "启动五子棋对战系统..."
echo ""

# 启动后端
cd backend
npm install
npm run dev &
BACKEND_PID=$!

cd ..

# 等待后端启动
sleep 3

# 启动前端
cd frontend
npm install
npm run dev &
FRONTEND_PID=$!

echo ""
echo "系统启动中..."
echo "后端服务: http://localhost:3001"
echo "前端访问: http://localhost:3000"
echo ""
echo "按 Ctrl+C 停止服务"

# 等待用户输入
wait