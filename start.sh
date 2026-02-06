#!/bin/bash

echo "Starting Gobang Server..."
echo ""

# Start backend
cd backend
npm install
npm run dev &
BACKEND_PID=$!

cd ..

# Wait for backend
sleep 3

# Start frontend
cd frontend
npm install
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Servers started!"
echo "Backend: http://localhost:8090"
echo "Frontend: http://localhost:8091"
echo ""
echo "Press Ctrl+C to stop"

wait