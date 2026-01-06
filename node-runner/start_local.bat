@echo off
REM DoAi.Me NodeRunner - Local Test Mode

set NODE_ID=%COMPUTERNAME%
set LAIXI_HOST=127.0.0.1
set LAIXI_PORT=22221

echo ============================================
echo DoAi.Me NodeRunner - LOCAL TEST MODE
echo NODE_ID: %NODE_ID%
echo CENTRAL: ws://localhost:8000/ws/node
echo ============================================

python noderunner.py --local

pause
